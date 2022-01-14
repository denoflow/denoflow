import { log } from "../../deps.ts";
const Debug = Deno.env.get("DEBUG");
const isDebug = Debug !== undefined && Debug !== "false";

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
      level: isDebug ? "DEBUG" : "INFO",
    },
  },
});
export function getReporter(name: string): log.Logger {
  const envDebug = Deno.env.get("DEBUG");
  const isEnvDebug = envDebug !== undefined && envDebug !== "false";
  const reporter = log.getLogger(name);

  reporter.level = isEnvDebug ? log.LogLevels.DEBUG : log.LogLevels.INFO;
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
