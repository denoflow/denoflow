import { log } from "../../deps.ts";

await log.setup({
  handlers: {
    default: new log.handlers.ConsoleHandler("DEBUG", {
      formatter: "{levelName} {msg}",
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
    new log.handlers.ConsoleHandler("DEBUG", {
      formatter: (logRecord) => {
        const {
          levelName,
          loggerName,
          msg,
          datetime,
        } = logRecord;
        let finalMsg = "";
        finalMsg += `[${levelName} ${datetime.toLocaleString()} `;

        finalMsg += `${loggerName}] ${msg} `;

        logRecord.args.forEach((arg, index) => {
          finalMsg += `, arg${index}: ${arg}`;
        });

        return finalMsg;
      },
    }),
  ];
  return reporter;
}
export default log.getLogger();
