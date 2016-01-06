
let path = require('path')
let object = require('underscore').object

let sniff = require('../../util/sniff')
let noop = require('../../util/noop')
let spawn = require('../../util/spawn')

let rimraf = require('../../promised/rimraf')
let glob = require('../../promised/glob')
let mkdirp = require('../../promised/mkdirp')
let fs = require('../../promised/fs')

let log = require('../../util/log')('installers/archive')

let is_tar = async function (path) {
  let type = await sniff.path(path)
  return type && type.ext === 'tar'
}

let verbose = (process.env.THE_DEPTHS_OF_THE_SOUL === '1')

let self = {
  sevenzip_list: async function (version, logger, archive_path) {
    let opts = {logger}
    let sizes = {}
    let total_size = 0

    await spawn({
      command: '7za',
      args: ['-slt', 'l', archive_path],
      split: '\n\n',
      ontoken: (token) => {
        let item = object(token.split('\n').map((x) => x.replace(/\r$/, '').split(' = ')))
        if (!item.Size || !item.Path) return
        if (verbose) {
          log(opts, `list: ${item.Size} | ${item.Path}`)
        }
        let item_path = path.normalize(item.Path)
        let size = parseInt(item.Size, 10)

        total_size += (sizes[item_path] = size)
      },
      logger
    })
    return {sizes, total_size}
  },

  sevenzip_extract: async function (version, logger, archive_path, dest_path, onprogress) {
    let opts = {logger}
    let err_state = false
    let err

    let EXTRACT_RE = /^Extracting\s+(.+)$/
    let additional_args = []

    if (/^15/.test(version)) {
      EXTRACT_RE = /^-\s(.+)$/
      additional_args.push('-bb1')
    }

    await mkdirp(dest_path)
    await spawn({
      command: '7za',
      args: ['x', archive_path, '-o' + dest_path, '-y'].concat(additional_args),
      split: '\n',
      ontoken: (token) => {
        if (verbose) {
          log(opts, `extract: ${token}`)
        }
        if (err_state) {
          if (!err) err = token
          return
        }
        if (token.match(/^Error:/)) {
          err_state = 1
          return
        }

        let matches = EXTRACT_RE.exec(token)
        if (!matches) return

        let item_path = path.normalize(matches[1])
        onprogress(item_path)
      },
      logger
    })

    if (err) throw err
  },

  install: async function (opts) {
    let logger = opts.logger
    let archive_path = opts.archive_path
    let dest_path = opts.dest_path
    let onprogress = opts.onprogress || noop

    log(opts, `extracting archive '${archive_path}' to '${dest_path}'`)

    let ibrew = require('../../util/ibrew')
    let version = await ibrew.get_local_version('7za')
    log(opts, `...using 7-zip version ${version}`)

    let extracted_size = 0
    let total_size = 0

    let info = await self.sevenzip_list(version, logger, archive_path)
    total_size = info.total_size
    log(opts, `archive contains ${Object.keys(info.sizes).length} files, ${total_size} total`)

    let sevenzip_progress = (f) => {
      extracted_size += (info.sizes[f] || 0)
      let percent = extracted_size / total_size * 100
      onprogress({ extracted_size, total_size, percent })
    }
    await self.sevenzip_extract(version, logger, archive_path, dest_path, sevenzip_progress)

    log(opts, `done extracting ${archive_path}`)

    let files = await glob('*', {nodir: true, cwd: dest_path})

    // Files in .tar.gz, .tar.bz2, etc. need a second 7-zip invocation
    if (!opts.tar && files.length === 1) {
      let tar = path.join(dest_path, files[0])
      if (await is_tar(tar)) {
        log(opts, `found tar: ${tar}, re-extracting`)
        let sub_opts = Object.assign({}, opts, {archive_path: tar, tar: true})

        let res = await self.install(sub_opts)
        await fs.unlinkAsync(tar)
        return res
      }
    }

    return {extracted_size, total_size}
  },

  uninstall: async function (opts) {
    let dest_path = opts.dest_path

    log(opts, `wiping directory ${dest_path}`)

    await rimraf(dest_path, {
      disableGlob: true // rm -rf + globs sound like the kind of evening I don't like
    })
  }
}

module.exports = self
