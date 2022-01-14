import { cac } from "./deps.ts";
import { run } from "./src/core/run-workflows.ts";
function main() {
  const cli = cac("denoflow");
  cli
    .command("run [...files]", "Run workflows")
    .option("--force", "Force run workflow files", {
      default: false,
    }).option("--max-items", "max items for workflow every runs")
    .action((files, options) => {
      // ...

      run({
        ...options,
        files: files,
      }).catch((e) => {
        throw e;
      });
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
