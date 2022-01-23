import { bold, gray, green, log, red, yellow } from "../deps.ts";
export class ReportHandler extends log.handlers.BaseHandler {
  format(logRecord: log.LogRecord): string {
    const msg = super.format(logRecord);
    return msg;
  }

  log(msg: string): void {
    console.log(msg);
  }
}
await log.setup({
  handlers: {
    default: new ReportHandler("INFO", {
      formatter: msgFormatter,
    }),
  },

  loggers: {
    // configure default logger available via short-hand methods above.
    default: {
      handlers: ["default"],
      level: "INFO",
    },
  },
});

export function getReporter(
  name: string,
  debug: boolean,
): log.Logger {
  const reporter = log.getLogger(name);

  reporter.level = debug ? log.LogLevels.DEBUG : log.LogLevels.INFO;
  reporter.handlers = [
    new ReportHandler("DEBUG", {
      formatter: msgFormatter,
    }),
  ];
  return reporter;
}
export default log.getLogger();
function msgFormatter(logRecord: log.LogRecord): string {
  const {
    loggerName,
    msg,
    level,
  } = logRecord;
  let finalMsg = "";
  let loggerNameFormated = `[${loggerName}]`;

  if (loggerName === "default") {
    loggerNameFormated = "";
  }
  if (loggerNameFormated) {
    loggerNameFormated = gray(loggerNameFormated);
  }
  if (
    logRecord.args.length > 0 && typeof logRecord.args[0] === "string"
  ) {
    finalMsg += `${formatMsgColor(level, logRecord.args[0])} `;

    finalMsg += `${msg} ${loggerNameFormated}`;
  } else {
    finalMsg += `${msg} ${loggerNameFormated}`;
    logRecord.args.forEach((arg, index) => {
      finalMsg += `, arg${index}: ${arg}`;
    });
    finalMsg = formatMsgColor(level, finalMsg);
  }

  return finalMsg;
}

export function formatMsgColor(level: log.LogLevels, msg: string): string {
  switch (level) {
    case log.LogLevels.DEBUG:
      msg = green(msg);
      break;
    case log.LogLevels.INFO:
      msg = green(msg);
      break;
    case log.LogLevels.WARNING:
      msg = yellow(msg);
      break;
    case log.LogLevels.ERROR:
      msg = red(msg);
      break;
    case log.LogLevels.CRITICAL:
      msg = bold(red(msg));
      break;
    default:
      break;
  }
  return msg;
}
