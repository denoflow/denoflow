import {
  Context,
  InternalState,
  RunWorkflowOptions,
  Trigger,
  Workflow,
} from "./interface.ts";
import { parseWorkflow } from "./parse-workflow.ts";
import { getContent } from "./utils/file.ts";
import { getFilesByFilter } from "./utils/filter.ts";
import { runScript } from "./run-script.ts";
import { parseStep } from "./parse-step.ts";
import { runStep } from "./run-step.ts";
import { filterTrigger } from "./filter-trigger.ts";
import { dirname } from "https://deno.land/std@0.121.0/path/mod.ts";
import report from "./report.ts";
import { JsonStoreAdapter } from "./adapters/json-store-adapter.ts";
import { Keydb } from "https://deno.land/x/keydb/keydb.ts";
interface ValidWorkflow {
  ctx: Context;
  workflow: Workflow;
}
export async function run(options: RunWorkflowOptions) {
  console.log("foler", options);
  const {
    filter,
  } = options;
  const workflowFiles = await getFilesByFilter(filter);
  const env = Deno.env.toObject();
  const validWorkflows: ValidWorkflow[] = [];
  for (let i = 0; i < workflowFiles.length; i++) {
    const workflowFilePath = workflowFiles[i];
    const fileContent = await getContent(workflowFilePath);
    const workflow = parseWorkflow(fileContent);
    // console.log("workflow", workflow);
    // init db
    const db = new Keydb(new JsonStoreAdapter("data"), {
      namespace: workflowFilePath,
    });
    // unique key
    const state = await db.get("state") || undefined;
    const internalState = await db.get("internalState") || {
      uniqueKeys: [],
    };
    validWorkflows.push({
      ctx: {
        env,
        workflowPath: workflowFilePath,
        workflowCwd: dirname(workflowFilePath),
        cwd: Deno.cwd(),
        steps: {},
        internalState,
        state,
      },
      workflow: workflow,
    });
    // run code
  }

  // run workflows step by step
  for (let i = 0; i < validWorkflows.length; i++) {
    let { ctx, workflow } = validWorkflows[i];

    const on = workflow.on as Trigger;
    // run trigger
    ctx = await runStep(ctx, on);
    console.log("ctx", ctx);
    // run then

    ctx = filterTrigger(ctx, on);
    // run steps
    for (let index = 0; index < (ctx.items as unknown[]).length; index++) {
      ctx.index = index;
      ctx.item = (ctx.items as unknown[])[index];
      for (let j = 0; j < workflow.steps.length; j++) {
        const step = workflow.steps[j];
        const parsedStep = parseStep(step, ctx);
        console.log("parsedStep", parsedStep);
        try {
          const stepResult = await runStep(ctx, parsedStep);
          console.log("stepResult", stepResult);

          ctx.steps["0"] = stepResult;
          if (step.id) {
            ctx.steps[step.id] = stepResult;
          }
        } catch (e) {
          report.error(e);
          break;
        }
      }
    }
  }
}

export async function runWorkflow(workflow: Workflow) {
}
