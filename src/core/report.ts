import * as log from "https://deno.land/std@0.121.0/log/mod.ts";
const Debug = Deno.env.get("DEBUG");
const isDebug = Debug !== undefined && Debug !== "false";

await log.setup({
  handlers: {
    console: new log.handlers.ConsoleHandler("DEBUG"),
  },

  loggers: {
    // configure default logger available via short-hand methods above.
    report: {
      handlers: ["console"],
      level: isDebug ? "DEBUG" : "INFO",
    },
  },
});

export default log.getLogger("report");
