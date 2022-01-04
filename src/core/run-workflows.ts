import { RunWorkflowOptions, Workflow } from "./interface.ts";
import { parseWorkflow } from "./parse-workflow.ts";
import { getContent } from "./utils/file.ts";
import { getFilesByFilter } from "./utils/filter.ts";

export async function run(options: RunWorkflowOptions) {
  console.log("foler", options);
  const {
    filter,
  } = options;
  const workflowFiles = await getFilesByFilter(filter);
  for (let i = 0; i < workflowFiles.length; i++) {
    const fileContent = await getContent(filter);
    const workflow = parseWorkflow(fileContent);
    const { files } = await Deno.emit(
      "https://deno.land/std@0.119.0/encoding/yaml.ts",
      {
        // sources: {
        //   "/mod.ts": `import * as a from "./a.ts";\nconsole.log(a);\n`,
        //   "/a.ts": `export const a: Record<string, string> = {};\n`,
        // },
      },
    );
    console.log("files", files);

    // run code
  }
}

export async function runWorkflow(workflow: Workflow) {
}
