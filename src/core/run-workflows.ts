import { RunWorkflowOptions, Workflow } from "./interface.ts";
import { parseWorkflow } from "./parse-workflow.ts";
import { getContent } from "./utils/file.ts";
import { getFilesByFilter } from "./utils/filter.ts";
import { runScript } from "./run-script.ts";
import { JsonStoreAdapter } from "./adapters/json-store-adapter.ts";
import { Keydb } from "https://deno.land/x/keydb/keydb.ts";
export async function run(options: RunWorkflowOptions) {
  console.log("foler", options);
  const {
    filter,
  } = options;
  const workflowFiles = await getFilesByFilter(filter);
  for (let i = 0; i < workflowFiles.length; i++) {
    const fileContent = await getContent(filter);
    const workflow = parseWorkflow(fileContent);
    console.log("workflow", workflow);

    // run code
  }
  // init db
  const db = new Keydb(new JsonStoreAdapter("data"));
  await db.set("test", {
    value: "test",
  });
}

export async function runWorkflow(workflow: Workflow) {
}
