import { cac } from "./deps.ts";
import { run } from "./src/core/run-workflows.ts";
function main() {
  const cli = cac("denoflow");
  cli
    .command("run", "Run workflows")
    .option("--filter <filter>", "Filter for workflow files", {
      default: "workflows",
    })
    .action((options) => {
      // ...
      console.log("filter", options);
      run(options);
    });

  cli
    .command("build [project]", "Build a project")
    .option("--out <dir>", "Output directory")
    .action((folder, options) => {
      // ...
    });
  cli.help();
  // Display version number when `-v` or `--version` appears
  // It's also used in help message
  cli.version("0.0.0");

  cli.parse();
}

main();
