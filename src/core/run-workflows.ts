import { Context, RunWorkflowOptions, Trigger, Workflow } from "./interface.ts";
import { parseWorkflow } from "./parse-workflow.ts";
import { getContent } from "./utils/file.ts";
import { getFilesByFilter } from "./utils/filter.ts";
import { parseStep } from "./parse-step.ts";
import { runStep } from "./run-step.ts";
import { filterTrigger } from "./filter-trigger.ts";
import { dirname } from "https://deno.land/std@0.121.0/path/mod.ts";
import report from "./report.ts";
import { JsonStoreAdapter } from "./adapters/json-store-adapter.ts";
import { Keydb } from "../../deps.ts";
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
        public: {
          env,
          workflowPath: workflowFilePath,
          workflowCwd: dirname(workflowFilePath),
          cwd: Deno.cwd(),
          steps: {},
          state,
        },
        internalState,
        db: db,
        initState: JSON.stringify(state),
        initInternalState: JSON.stringify(internalState),
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
    // run then

    ctx = filterTrigger(ctx, on);

    // run steps
    if ((ctx.public.items as unknown[]).length === 0) {
      // no need to handle steps
      report.info(`No trigger items, skip workflow ${ctx.public.workflowPath}`);
      continue;
    } else {
      report.info(
        `Found ${
          (ctx.public.items as unknown[]).length
        } items, start run workflow ${ctx.public.workflowPath} steps.`,
      );
    }
    for (
      let index = 0;
      index < (ctx.public.items as unknown[]).length;
      index++
    ) {
      ctx.public.index = index;
      ctx.public.item = (ctx.public.items as unknown[])[index];
      for (let j = 0; j < workflow.steps.length; j++) {
        const step = workflow.steps[j];

        const parsedStep = await parseStep(step, ctx);
        report.info(
          `Start run workflow ${ctx.public.workflowPath} step ${step.id ?? j}.`,
        );
        try {
          const stepResult = await runStep(ctx, parsedStep);

          ctx.public.steps["0"] = stepResult;
          if (step.id) {
            ctx.public.steps[step.id] = stepResult;
          }
          report.info(
            `Workflow ${ctx.public.workflowPath} step ${step.id ?? j} success.`,
          );
        } catch (e) {
          report.error(
            `Workflow ${ctx.public.workflowPath} step ${
              step.id ?? j
            } failed, Skip this workflow`,
            e,
          );
          break;
        }
      }
    }
    // save state, internalState
    // check is changed
    const currentState = JSON.stringify(ctx.public.state);
    const currentInternalState = JSON.stringify(ctx.internalState);
    if (currentState !== ctx.initState) {
      report.debug(`Save sate for ${ctx.public.workflowPath}`);
      await ctx.db.set("state", ctx.public.state);
    } else {
      report.debug(`Skip save sate for ${ctx.public.workflowPath}`);
    }
    if (currentInternalState !== ctx.initInternalState) {
      report.debug(`Save internalState for ${ctx.public.workflowPath}`);
      await ctx.db.set("internalState", ctx.internalState);
    } else {
      report.debug(`Skip save internalState for ${ctx.public.workflowPath}`);
    }
    report.info(
      `Workflow ${ctx.public.workflowPath} success.`,
    );
  }
}

export async function runWorkflow(workflow: Workflow) {
}
