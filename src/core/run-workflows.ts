import {
  FilterOptions,
  RunWorkflowOptions,
  SourceOptions,
  StepOptions,
  WorkflowOptions,
} from "./interface.ts";
import { Context, StepType } from "./internal-interface.ts";
import { parseWorkflow } from "./parse-workflow.ts";
import { getContent } from "./utils/file.ts";
import { getFilesByFilter } from "./utils/filter.ts";
import { isObject } from "./utils/object.ts";
import { parseObject } from "./parse-object.ts";
import { getStepResponse, runStep, setErrorResult } from "./run-step.ts";
import { filterCtxItems, filterSourceItems } from "./filter-items.ts";
import { dirname, join, log } from "../../deps.ts";
import report, { getReporter } from "./report.ts";
import { JsonStoreAdapter } from "./adapters/json-store-adapter.ts";
import { Keydb } from "../../deps.ts";
import {
  getDefaultRunOptions,
  getDefaultSourceOptions,
} from "./default-options.ts";
interface ValidWorkflow {
  ctx: Context;
  workflow: WorkflowOptions;
}
export async function run(runOptions: RunWorkflowOptions) {
  const formatedRunOptions = getDefaultRunOptions(runOptions);
  const {
    files,
  } = formatedRunOptions;
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
      keys: [],
    };
    validWorkflows.push({
      ctx: {
        public: {
          env,
          workflowPath: workflowFilePath,
          workflowRelativePath: workflowRelativePath,
          workflowCwd: dirname(workflowFilePath),
          cwd: cwd,
          sources: {},
          steps: {},
          state,
          items: [],
        },
        itemKeys: [],
        itemSourceOptions: [],
        internalState,
        db: db,
        initState: JSON.stringify(state),
        initInternalState: JSON.stringify(internalState),
        currentStepType: StepType.Source,
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
    // parse root env first
    // parse env first
    const parsedWorkflowFileOptionsWithEnv = await parseObject(workflow, ctx, {
      keys: ["env"],
    }) as WorkflowOptions;
    // run env
    // parse env to env
    if (parsedWorkflowFileOptionsWithEnv.env) {
      for (const key in parsedWorkflowFileOptionsWithEnv.env) {
        const value = parsedWorkflowFileOptionsWithEnv.env[key];
        if (typeof value === "string") {
          Deno.env.set(key, value);
        }
      }
    }

    // parse general options

    const parsedWorkflowGeneralOptionsWithGeneral = await parseObject(
      workflow,
      ctx,
      {
        keys: ["general"],
      },
    ) as WorkflowOptions;
    const generalOptions = parsedWorkflowGeneralOptionsWithGeneral.general ||
      {};
    ctx.public.options = generalOptions;
    const workflowReporter = getReporter(
      `${ctx.public.workflowRelativePath}`,
    );
    try {
      const sources = workflow.sources;
      if (sources) {
        for (let sourceIndex = 0; sourceIndex < sources.length; sourceIndex++) {
          const source = sources[sourceIndex];
          ctx.public.sourceIndex = sourceIndex;
          const sourceReporter = getReporter(
            `${ctx.public.workflowRelativePath} -> source:${ctx.public.sourceIndex}`,
          );
          // parse env first
          const parsedSourceOptionsWithEnv = await parseObject(source, ctx, {
            keys: ["env"],
          }) as SourceOptions;

          // parse if only
          const parsedSourceOptionsWithIf = await parseObject(
            parsedSourceOptionsWithEnv,
            ctx,
            {
              keys: ["if", "debug"],
            },
          ) as SourceOptions;

          // set log level
          if (parsedSourceOptionsWithIf?.debug || ctx.public.options?.debug) {
            sourceReporter.level = log.LogLevels.DEBUG;
          }

          // check if need to run
          if (parsedSourceOptionsWithIf.if === false) {
            sourceReporter.info(
              `Skip this source because if condition is false`,
            );
            continue;
          }

          // parse on
          // insert step env
          const parsedSourceOptions = await parseObject(
            parsedSourceOptionsWithIf,
            {
              ...ctx,
              public: {
                ...ctx.public,
                env: {
                  ...ctx.public.env,
                  ...parsedSourceOptionsWithIf.env,
                },
              },
            },
          ) as SourceOptions;

          // get options
          const sourceOptions = getDefaultSourceOptions(
            generalOptions,
            formatedRunOptions,
            parsedSourceOptions,
          );

          try {
            // run source
            ctx = await runStep(ctx, {
              reporter: sourceReporter,
              ...sourceOptions,
            });

            // run filter
            ctx = await filterSourceItems(ctx, {
              ...sourceOptions,
              reporter: sourceReporter,
            });
            ctx.public.sources[sourceIndex] = getStepResponse(ctx);
            if (sourceOptions.id) {
              ctx.public.steps[sourceOptions.id] =
                ctx.public.sources[sourceIndex];
            }
          } catch (e) {
            ctx = setErrorResult(ctx, e);
            ctx.public.sources[sourceIndex] = getStepResponse(ctx);
            if (sourceOptions.id) {
              ctx.public.sources[sourceOptions.id] =
                ctx.public.sources[sourceIndex];
            }
            ctx.public.ok = false;
            sourceReporter.error(
              `Failed to run source`,
            );
            sourceReporter.error(e);
            sourceReporter.warning(
              `Skip this source because of error`,
            );
            break;
          }
        }
      }

      // run filter
      const filter = workflow.filter;
      if (filter) {
        ctx.currentStepType = StepType.Filter;
        const filterReporter = getReporter(
          `${ctx.public.workflowRelativePath} -> filter`,
        );
        // parse env first
        const parsedFilterOptionsWithEnv = await parseObject(filter, ctx, {
          keys: ["env"],
        }) as FilterOptions;

        // parse if only
        const parsedFilterOptionsWithIf = await parseObject(
          parsedFilterOptionsWithEnv,
          ctx,
          {
            keys: ["if", "debug"],
          },
        ) as FilterOptions;

        // set log level
        if (parsedFilterOptionsWithIf?.debug || ctx.public.options?.debug) {
          filterReporter.level = log.LogLevels.DEBUG;
        }

        // check if need to run
        if (parsedFilterOptionsWithIf.if === false) {
          filterReporter.info(
            `Skip this Filter because if condition is false`,
          );
          continue;
        }

        // parse on
        // insert step env
        const parsedFilterOptions = await parseObject(
          parsedFilterOptionsWithIf,
          {
            ...ctx,
            public: {
              ...ctx.public,
              env: {
                ...ctx.public.env,
                ...parsedFilterOptionsWithIf.env,
              },
            },
          },
        ) as FilterOptions;

        // get options
        const filterOptions = getDefaultSourceOptions(
          generalOptions,
          formatedRunOptions,
          parsedFilterOptions,
        );

        try {
          // run Filter
          ctx = await runStep(ctx, {
            reporter: filterReporter,
            ...filterOptions,
          });

          ctx.public.filter = getStepResponse(ctx);

          // run filter
          ctx = filterCtxItems(ctx, {
            ...filterOptions,
            reporter: filterReporter,
          });
        } catch (e) {
          ctx = setErrorResult(ctx, e);
          ctx.public.filter = getStepResponse(ctx);
          ctx.public.ok = false;

          filterReporter.error(
            `Failed to run Filter`,
          );
          filterReporter.error(e);
          filterReporter.warning(
            `Skip this Filter because of error`,
          );
          break;
        }
      }

      // run steps
      if ((ctx.public.items as unknown[]).length === 0) {
        // no need to handle steps
        workflowReporter.info(
          `Skip this workflow because no any valid sources items returned`,
        );
        continue;
      } else {
        workflowReporter.info(
          `Start to run steps, get ${
            (ctx.public.items as unknown[]).length
          } items.`,
        );
      }
      ctx.currentStepType = StepType.Step;

      for (
        let index = 0;
        index < (ctx.public.items as unknown[]).length;
        index++
      ) {
        ctx.public.itemIndex = index;
        ctx.public.itemKey = ctx.itemKeys[index];
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
          const parsedStepWithEnv = await parseObject(step, ctx, {
            keys: ["env"],
          }) as StepOptions;

          // parse if only
          const parsedStepWithIf = await parseObject(parsedStepWithEnv, ctx, {
            keys: ["if", "debug"],
          }) as StepOptions;
          if (parsedStepWithIf.debug || ctx.public.options?.debug) {
            stepReporter.level = log.LogLevels.DEBUG;
          }
          if (parsedStepWithIf.if === false) {
            stepReporter.info(
              `Skip this step because if condition is false`,
            );
            continue;
          }
          // parse on
          // insert step env
          const parsedStep = await parseObject(parsedStepWithIf, {
            ...ctx,
            public: {
              ...ctx.public,
              env: {
                ...ctx.public.env,
                ...parsedStepWithIf.env,
              },
            },
          }) as StepOptions;
          // get options
          const stepOptions = getDefaultSourceOptions(
            generalOptions,
            formatedRunOptions,
            parsedStep,
          );
          stepReporter.debug(
            `Start run this step.`,
          );
          try {
            ctx = await runStep(ctx, {
              ...stepOptions,
              reporter: stepReporter,
            });

            ctx.public.steps[j] = getStepResponse(ctx);
            if (step.id) {
              ctx.public.steps[step.id] = ctx.public.steps[j];
            }

            stepReporter.debug(
              `Finish to run this step.`,
            );
          } catch (e) {
            ctx.public.steps[j] = getStepResponse(ctx);
            if (step.id) {
              ctx.public.steps[step.id] = ctx.public.steps[j];
            }
            // not need to check onContinueError, cause runStep has checked it .

            stepReporter.error(
              `Failed to run this step`,
            );
            stepReporter.error(e);
            stepReporter.info(
              `Skip this step because of error`,
            );
            break;
          }
          // this item steps all ok, add unique keys to the internal state

          // check is !force
          // get item source options
          const itemSourceOptions = ctx.itemSourceOptions[index];
          if (!itemSourceOptions.force) {
            if (!ctx.internalState.keys) {
              ctx.internalState.keys = [];
            }
            if (
              ctx.public.itemKey &&
              !ctx.internalState.keys.includes(ctx.public.itemKey!)
            ) {
              ctx.internalState.keys.push(ctx.public.itemKey!);
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
      // add success items uniqueKey to internal State

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
