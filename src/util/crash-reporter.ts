
import {shell, dialog} from "electron";
import * as electron from "electron";
const app = electron.app || electron.remote.app;

import env from "../env";

import * as path from "path";
import * as querystring from "querystring";

import platformData from "../constants/platform-data";
import urls from "../constants/urls";

import {findWhere} from "underscore";

import * as os from "../os";
import sf from "../os/sf";

export interface IReportIssueOpts {
  log?: string;
  body?: string;
  type?: string;
  repo?: string;
  before?: string;
}

let self = {
  catching: false,

  sampleCrash: () => {
    setTimeout(() => {
      throw new Error("hello this is crash reporter with a sample crash.");
    }, 10);
  },

  writeCrashLog: async (e: Error) => {
    const crashFile = path.join(app.getPath("userData"), "crash_logs", `${+new Date()}.txt`);

    let log = "";
    log += (e.stack || e.message || e);

    if (os.platform() === "win32") {
      log = log.replace(/\n/g, "\r\n");
    }
    await sf.writeFile(crashFile, log, {encoding: "utf8"});

    return {log, crashFile};
  },

  reportIssue: (opts: IReportIssueOpts) => {
    if (typeof opts === "undefined") {
      opts = {};
    }

    const log = opts.log;
    let body = opts.body || "";
    let type = opts.type || "Issue";
    const repo = opts.repo || urls.itchRepo;
    const before = opts.before || "";

    if (typeof log !== "undefined") {
      type = "Feedback";
      body =
`Event log:

\`\`\`
${log}
\`\`\`
`;
    }

    const platformEmoji = findWhere(platformData, {platform: os.itchPlatform()}).emoji;
    const query = querystring.stringify({
      title: `${platformEmoji} ${type} v${app.getVersion()}`,
      body: (before + body),
    });
    let url = `${repo}/issues/new?${query}`;
    const maxLen = 2000;
    if (url.length > maxLen) {
      url = url.substring(0, maxLen);
    }
    shell.openExternal(url);
  },

  handle: async function (type: string, e: Error) {
    if (self.catching) {
      // tslint:disable-next-line
      console.log(`While catching: ${e.stack || e}`);
      return;
    }
    self.catching = true;

    // tslint:disable-next-line
    console.log(`${type}: ${e.stack}`);
    let res = await self.writeCrashLog(e);
    let log = res.log;
    let crashFile = res.crashFile;

    if (env.name === "test") {
      // tslint:disable-next-line
      console.log(`Crash log written to ${res.crashFile}, bailing out`);
      os.exit(1);
      return;
    }

    // TODO: something better
    const t = require("../localizer").getT({}, "en");

    let dialogOpts = {
      type: "error" as "error", // woo typescript is crazy stuff, friendos
      buttons: [
        t("prompt.crash_reporter.report_issue", {defaultValue: "Report issue"}),
        t("prompt.crash_reporter.open_crash_log", {defaultValue: "Open crash log"}),
        t("prompt.action.close", {defaultValue: "Close"}),
      ],
      message: t("prompt.crash_reporter.message", {defaultValue: "The application has crashed"}),
      detail: t("prompt.crash_reporter.detail", {
        defaultValue: `A crash log was written to ${crashFile}`,
        location: crashFile,
      }),
    };

    await new Promise(async function (resolve, reject) {
      let callback = (response: number) => {
        if (response === 0) {
          self.reportIssue({log});
        } else if (response === 1) {
          shell.openItem(crashFile);
        }
        os.exit(1);
      };

      // try to show error dialog
      // supplying defaultValues everywhere in case the i18n system hasn't loaded yet
      dialog.showMessageBox(dialogOpts, callback);
    });

    self.catching = false;
  },

  mount: () => {
    const makeHandler = (type: string) => {
      return async function (e: Error) {
        try {
          await self.handle(type, e);
        } catch (e) {
          // well, we tried.
          console.log(`Error in crash-reporter (${type})\n${e.message || e}`); // tslint:disable-line:no-console
        } finally {
          if (type === "uncaughtException") {
            os.exit(1);
          }
        }
      };
    };
    process.on("uncaughtException", makeHandler("Uncaught exception"));
    process.on("unhandledRejection", makeHandler("Unhandled rejection"));
  },
};

export default self;
