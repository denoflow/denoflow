import { cac } from "./deps.ts";
import { run } from "./src/core/run-workflows.ts";
import { getStdin } from "https://deno.land/x/get_stdin@v1.1.0/mod.ts";

function main() {
  const cli = cac("denoflow");
  cli
    .command("run [...files]", "Run workflows")
    .option(
      "--force",
      "Force run workflow files, if true, will ignore to read/save state",
    ).option(
      "--debug",
      "Debug mode, will print more info",
    ).option(
      "--database",
      "Database uri, default json://data",
    ).option("--limit", "max items for workflow every runs").option(
      "--sleep",
      "sleep time between sources, filter, steps, unit seconds",
    ).option(
      "--stdin",
      "read yaml file from stdin, e.g. cat test.yml | denoflow run --stdin",
    )
    .action(async (files, options) => {
      let content: string | undefined;
      if (options.stdin) {
        content = await getStdin({ exitOnEnter: false });
      }
      await run({
        ...options,
        content: content,
        files: files,
      });
    });

  // default command
  cli
    // Simply omit the command name, just brackets
    .command("[SUB COMMAND] [...files] [OPTIONS]", "")
    .action(() => {
      cli.outputHelp();
    });

  cli.help();
  // Display version number when `-v` or `--version` appears
  // It's also used in help message
  cli.version("0.0.0");

  cli.parse();
}

if (import.meta.main) {
  main();
}
