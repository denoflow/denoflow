import { Context, RunWorkflowOptions, Workflow } from "./interface.ts";
import { parseWorkflow } from "./parse-workflow.ts";
import { getContent } from "./utils/file.ts";
import { getFilesByFilter } from "./utils/filter.ts";
import { isObject } from "./utils/object.ts";
import { parseStep } from "./parse-step.ts";
import { runStep } from "./run-step.ts";
import { filterTrigger } from "./filter-trigger.ts";
import { dirname, join, log } from "../../deps.ts";
import report, { getReporter } from "./report.ts";
import { JsonStoreAdapter } from "./adapters/json-store-adapter.ts";
import { Keydb } from "../../deps.ts";
import {
  getDefaultRunOptions,
  getDefaultWorkflowOptions,
} from "./default-options.ts";
interface ValidWorkflow {
  ctx: Context;
  workflow: Workflow;
}
export async function run(runOptions: RunWorkflowOptions) {
  const options = getDefaultRunOptions(runOptions);
  const {
    files,
  } = options;
  const cwd = Deno.cwd();
  const workflowFiles = await getFilesByFilter(cwd, files);
  const env = Deno.env.toObject();
  // get options
  const validWorkflows: ValidWorkflow[] = [];
  for (let i = 0; i < workflowFiles.length; i++) {
    const workflowRelativePath = workflowFiles[i];
    const workflowFilePath = join(cwd, workflowRelativePath);
    const fileContent = await getContent(workflowFilePath);
    const workflow = parseWorkflow(fileContent);
    if (!isObject(workflow)) {
      continue;
    }
    // init db
    const db = new Keydb(new JsonStoreAdapter("data"), {
      namespace: workflowRelativePath,
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
          workflowRelativePath: workflowRelativePath,
          workflowCwd: dirname(workflowFilePath),
          cwd: cwd,
          steps: {},
          state,
          options: options,
          items: [],
          stepOkResults: {},
          stepErrors: {},
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
  report.info(
    `Found ${validWorkflows.length} valid workflows: ${
      validWorkflows.map((item) => item.ctx.public.workflowRelativePath).join(
        "\n",
      )
    }`,
  );
  // run workflows step by step
  for (let i = 0; i < validWorkflows.length; i++) {
    let { ctx, workflow } = validWorkflows[i];
    const workflowReporter = getReporter(
      `${ctx.public.workflowRelativePath}`,
    );
    try {
      const on = workflow.on;
      if (on) {
        // parse env first
        const parsedOnWithEnv = await parseStep(on, ctx, {
          onlyEnv: true,
        });

        // parse if only
        const parsedOnWithIf = await parseStep(parsedOnWithEnv, ctx, {
          onlyIf: true,
        });
        // check if

        // check if need to run

        if (parsedOnWithIf.if === false) {
          workflowReporter.info(
            `Skip because if condition is false`,
          );
          continue;
        }

        // parse on
        // insert step env
        const parsedOn = await parseStep(parsedOnWithIf, {
          ...ctx,
          public: {
            ...ctx.public,
            env: {
              ...ctx.public.env,
              ...parsedOnWithIf.env,
            },
          },
        });

        // get options
        const workflowOptions = getDefaultWorkflowOptions(options, parsedOn);

        ctx.public.options = workflowOptions;
        if (ctx.public.options?.debug) {
          workflowReporter.level = log.LogLevels.DEBUG;
        }
        workflowReporter.debug(
          `WorkflowOptions: \n${JSON.stringify(workflowOptions, null, 2)}`,
        );
        const triggerReporter = getReporter(
          `${ctx.public.workflowRelativePath} -> trigger`,
        );
        if (ctx.public.options?.debug) {
          triggerReporter.level = log.LogLevels.DEBUG;
        }
        try {
          // run trigger
          ctx = await runStep(ctx, parsedOn, {
            reporter: triggerReporter,
          });

          // run filter
          ctx = filterTrigger(ctx, parsedOn, {
            reporter: triggerReporter,
          });
        } catch (e) {
          triggerReporter.error(
            `Failed to run trigger, continue to next workflow`,
          );
          triggerReporter.error(e);
          break;
        }
      }

      // run steps
      if ((ctx.public.items as unknown[]).length === 0) {
        // no need to handle steps
        workflowReporter.info(
          `Skip this workflow because no trigger items`,
        );
        continue;
      } else {
        workflowReporter.info(
          `Start to run, get ${(ctx.public.items as unknown[]).length} items.`,
        );
      }
      for (
        let index = 0;
        index < (ctx.public.items as unknown[]).length;
        index++
      ) {
        ctx.public.itemIndex = index;
        ctx.public.item = (ctx.public.items as unknown[])[index];
        const itemReporter = getReporter(
          `${ctx.public.workflowRelativePath} -> item:${index}`,
        );
        if (ctx.public.options?.debug) {
          itemReporter.level = log.LogLevels.DEBUG;
        }
        if (!workflow.steps) {
          workflowReporter.info(
            `Skip to run steps, because no steps in this workflow`,
          );
          break;
        }
        itemReporter.info(
          `Start to handle`,
        );
        for (let j = 0; j < workflow.steps.length; j++) {
          const step = workflow.steps[j];
          ctx.public.stepIndex = j;
          const stepReporter = getReporter(
            `${ctx.public.workflowRelativePath} -> step:${ctx.public.stepIndex}`,
          );

          // parse env first
          const parsedStepWithEnv = await parseStep(step, ctx, {
            onlyEnv: true,
          });

          // parse if only
          const parsedStepWithIf = await parseStep(parsedStepWithEnv, ctx, {
            onlyIf: true,
          });
          if (parsedStepWithIf.if === false) {
            stepReporter.info(
              `Skip this step because if condition is false`,
            );
            continue;
          }
          // parse on
          // insert step env
          const parsedStep = await parseStep(parsedStepWithIf, {
            ...ctx,
            public: {
              ...ctx.public,
              env: {
                ...ctx.public.env,
                ...parsedStepWithIf.env,
              },
            },
          });
          if (step.debug || ctx.public.options?.debug) {
            stepReporter.level = log.LogLevels.DEBUG;
          }

          stepReporter.debug(
            `Start run this step.`,
          );
          try {
            ctx = await runStep(ctx, parsedStep, {
              reporter: stepReporter,
            });

            ctx.public.steps[j] = ctx.public.result;
            if (step.id) {
              ctx.public.steps[step.id] = ctx.public.result;
            }
            ctx.public.stepOkResults[j] = true;
            if (step.id) {
              ctx.public.stepOkResults[step.id] = true;
            }
            stepReporter.debug(
              `Finish to run this step.`,
            );
          } catch (e) {
            ctx.public.stepOkResults[j] = true;
            if (step.id) {
              ctx.public.stepOkResults[step.id] = true;
            }
            ctx.public.stepErrors[j] = e.toString();
            if (step.id) {
              ctx.public.stepErrors[step.id] = e.toString();
            }
            if (parsedStep.continueOnError === true) {
              stepReporter.warning(
                `Failed to run step, but continueOnError is true, so ignore this error, continue to next step`,
              );
              stepReporter.warning(e);
            } else {
              stepReporter.error(
                `Failed to run this step, continue to next item`,
              );
              stepReporter.error(e);
              break;
            }
          }
        }
        itemReporter.info(
          `Finish to run with this item`,
        );
      }
      // save state, internalState
      // check is changed
      const currentState = JSON.stringify(ctx.public.state);
      const currentInternalState = JSON.stringify(ctx.internalState);
      if (currentState !== ctx.initState) {
        workflowReporter.debug(`Save state`);
        await ctx.db.set("state", ctx.public.state);
      } else {
        workflowReporter.debug(`Skip save sate, cause no change happened`);
      }
      if (currentInternalState !== ctx.initInternalState) {
        workflowReporter.debug(
          `Save internal state`,
        );
        await ctx.db.set("internalState", ctx.internalState);
      } else {
        workflowReporter.debug(
          `Skip save internal state, cause no change happened`,
        );
      }
      workflowReporter.info(
        `Finish to run this workflow`,
      );
    } catch (e) {
      workflowReporter.error(
        `Failed to run this workflow, Continue to next workflow`,
      );
      workflowReporter.error(e);
    }
    console.log("\n");
  }
}

export async function runWorkflow(workflow: Workflow) {
}
