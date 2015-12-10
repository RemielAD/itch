'use nodent';'use strict'

let Menu = require('electron').Menu

let CredentialsStore = require('../stores/credentials-store')
let AppActions = require('../actions/app-actions')

let clone = require('clone')

let repo_url = 'https://github.com/itchio/itchio-app'

function open_url (url) {
  require('electron').shell.openExternal(url)
}

let menus = {
  file: {
    label: 'File',
    submenu: [
      {
        label: 'Close Window',
        accelerator: 'CmdOrCtrl+W',
        click: AppActions.hide_window
      },
      {
        label: 'Quit',
        accelerator: 'CmdOrCtrl+Q',
        click: AppActions.quit
      }
    ]
  },

  edit: {
    label: 'Edit',
    visible: false,
    submenu: [
      {
        label: 'Cut',
        accelerator: 'CmdOrCtrl+X',
        role: 'cut'
      },
      {
        label: 'Copy',
        accelerator: 'CmdOrCtrl+C',
        role: 'copy'
      },
      {
        label: 'Paste',
        accelerator: 'CmdOrCtrl+V',
        role: 'paste'
      },
      {
        label: 'Select all',
        accelerator: 'CmdOrCtrl+A',
        role: 'selectall'
      }
    ]
  },

  account_disabled: {
    label: 'Account',
    submenu: [
      {
        label: 'Not logged in',
        enabled: false
      }
    ]
  },

  account: {
    label: 'Account',
    submenu: [
      {
        label: 'Change user...',
        click: AppActions.logout
      }
    ]
  },

  help: {
    label: 'Help',
    submenu: [
      {
        label: 'View itch.io Terms',
        click: () => open_url('https://itch.io/docs/legal/terms')
      },
      {
        label: 'View License',
        click: () => open_url(`${repo_url}/blob/master/LICENSE`)
      },
      {
        label: `Version ${require('electron').app.getVersion()}`,
        enabled: false
      },
      {
        label: 'Check for Update',
        click: AppActions.check_for_self_update
      },
      {
        type: 'separator'
      },
      {
        label: 'Report Issue',
        click: () => open_url(`${repo_url}/issues/new`)
      },
      {
        label: 'Search Issue',
        click: () => open_url(`${repo_url}/search?type=Issues`)
      },
      {
        type: 'separator'
      },
      {
        label: 'Release Notes',
        click: () => open_url(`${repo_url}/releases`)
      },
      {
        type: 'separator'
      },
      {
        label: 'Danger zone',
        submenu: [
          {
            label: 'Don\'t use this.',
            submenu: [
              {
                label: 'Provoke crash',
                click: () => { throw new Error('Silly human-provoked crash.') }
              }
            ]
          }
        ]
      }
    ]
  }
}

function refresh_menu () {
  let template = [
    menus.file,
    menus.edit,
    (CredentialsStore.get_current_user()
    ? menus.account
    : menus.account_disabled),
    menus.help
  ]

  // buildFromTemplate mutates its argument
  Menu.setApplicationMenu(Menu.buildFromTemplate(clone(template)))
}

let self = {
  mount: () => {
    CredentialsStore.add_change_listener('menu', refresh_menu)
    refresh_menu()
  }
}

module.exports = self
