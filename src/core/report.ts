import * as log from "https://deno.land/std@0.121.0/log/mod.ts";
await log.setup({
  loggers: {
    // configure default logger available via short-hand methods above.
    default: {
      level: "INFO",
    },
  },
});

export default log.getLogger();
