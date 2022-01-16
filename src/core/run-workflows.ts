import {
  FilterOptions,
  RunWorkflowOptions,
  SourceOptions,
  StepOptions,
  WorkflowOptions,
} from "./interface.ts";
import { hasPermissionSlient } from "./permission.ts";
import { Context, StepType } from "./internal-interface.ts";
import { parseWorkflow } from "./parse-workflow.ts";
import { getContent } from "./utils/file.ts";
import { getFilesByFilter } from "./utils/filter.ts";
import { isObject } from "./utils/object.ts";
import { parseObject } from "./parse-object.ts";
import { getStepResponse, runStep, setErrorResult } from "./run-step.ts";
import { filterCtxItems, filterSourceItems } from "./filter-items.ts";
import { delay, dirname, join, log, PostgresDb, SqliteDb } from "../../deps.ts";
import report, { getReporter } from "./report.ts";
import { Keydb } from "./adapters/json-store-adapter.ts";

import { runCmd, setCmdOkResult } from "./run-cmd.ts";
import {
  getDefaultRunOptions,
  getDefaultSourceOptions,
  getDefaultWorkflowOptions,
} from "./default-options.ts";

interface ValidWorkflow {
  ctx: Context;
  workflow: WorkflowOptions;
}

export async function run(runOptions: RunWorkflowOptions) {
  const debugEnvPermmision = { name: "env", variable: "DEBUG" } as const;
  const dataPermission = { name: "read", path: "data" } as const;

  let Debug = undefined;
  if (await hasPermissionSlient(debugEnvPermmision)) {
    Debug = Deno.env.get("DEBUG");
  }
  let isDebug = !!(Debug !== undefined && Debug !== "false");

  const cliWorkflowOptions = getDefaultRunOptions(runOptions, isDebug);
  isDebug = cliWorkflowOptions.debug || false;
  const {
    files,
  } = cliWorkflowOptions;

  const cwd = Deno.cwd();
  const workflowFiles = await getFilesByFilter(cwd, files);
  let env = {};
  const allEnvPermmision = { name: "env" } as const;

  if (await hasPermissionSlient(allEnvPermmision)) {
    env = Deno.env.toObject();
  }
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
          state: undefined,
          items: [],
        },
        itemSourceOptions: undefined,
        sourcesOptions: [],
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
  for (
    let workflowIndex = 0;
    workflowIndex < validWorkflows.length;
    workflowIndex++
  ) {
    let { ctx, workflow } = validWorkflows[workflowIndex];
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
      parsedWorkflowFileOptionsWithEnv,
      ctx,
      {
        keys: ["if", "debug", "database", "sleep"],
      },
    ) as WorkflowOptions;

    const workflowOptions = getDefaultWorkflowOptions(
      cliWorkflowOptions,
      parsedWorkflowGeneralOptionsWithGeneral ||
        {},
    );
    isDebug = workflowOptions.debug || false;

    const workflowReporter = getReporter(
      `${ctx.public.workflowRelativePath}`,
      isDebug,
    );

    // check if need to run
    if (workflowOptions?.if === false) {
      workflowReporter.info(
        `Skip this workflow because if condition is false`,
      );
      continue;
    }

    // merge to get default
    ctx.public.options = workflowOptions;

    const database = workflowOptions.database;
    let db;
    if (database?.startsWith("sqlite")) {
      db = new SqliteDb(database);
    } else if (database?.startsWith("postgres")) {
      db = new PostgresDb(database);
    } else {
      db = new Keydb(database, {
        namespace: ctx.public.workflowRelativePath,
      });
    }
    ctx.db = db;
    // check permission
    // unique key
    let state;
    let internalState = {
      keys: [],
    };
    if (await hasPermissionSlient(dataPermission)) {
      state = await db.get("state") || undefined;
      internalState = await db.get("internalState") || {
        keys: [],
      };
    }
    ctx.public.state = state;
    ctx.internalState = internalState;
    ctx.initState = JSON.stringify(state);
    ctx.initInternalState = JSON.stringify(internalState);

    const sources = workflow.sources;

    try {
      if (sources) {
        for (let sourceIndex = 0; sourceIndex < sources.length; sourceIndex++) {
          const source = sources[sourceIndex];
          ctx.public.sourceIndex = sourceIndex;
          const sourceReporter = getReporter(
            `${ctx.public.workflowRelativePath} -> source:${ctx.public.sourceIndex}`,
            isDebug,
          );
          let sourceOptions = {
            ...source,
          };
          try {
            // parse env first
            sourceOptions = await parseObject(source, ctx, {
              keys: ["env"],
            }) as SourceOptions;

            // parse if only
            sourceOptions = await parseObject(
              sourceOptions,
              ctx,
              {
                keys: ["if", "debug"],
              },
            ) as SourceOptions;

            // set log level
            if (sourceOptions?.debug || ctx.public.options?.debug) {
              sourceReporter.level = log.LogLevels.DEBUG;
            }

            // check if need to run
            if (sourceOptions.if === false) {
              sourceReporter.info(
                `Skip this source because if condition is false`,
              );
              continue;
            }

            // parse on
            // insert step env
            sourceOptions = await parseObject(
              sourceOptions,
              {
                ...ctx,
                public: {
                  ...ctx.public,
                  env: {
                    ...ctx.public.env,
                    ...sourceOptions.env,
                  },
                },
              },
            ) as SourceOptions;

            // get options
            sourceOptions = getDefaultSourceOptions(
              workflowOptions,
              cliWorkflowOptions,
              sourceOptions,
            );
            isDebug = sourceOptions.debug || false;

            ctx.sourcesOptions.push(sourceOptions);
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
            // run cmd

            if (sourceOptions.cmd) {
              const cmdResult = await runCmd(ctx, sourceOptions.cmd);
              ctx = setCmdOkResult(ctx, cmdResult.stdout);
            }

            ctx.public.sources[sourceIndex] = getStepResponse(ctx);
            if (sourceOptions.id) {
              ctx.public.sources[sourceOptions.id] =
                ctx.public.sources[sourceIndex];
            }
          } catch (e) {
            ctx = setErrorResult(ctx, e);
            ctx.public.sources[sourceIndex] = getStepResponse(ctx);
            if (source.id) {
              ctx.public.sources[source.id] = ctx.public.sources[sourceIndex];
            }
            if (source.continueOnError) {
              ctx.public.ok = true;
              sourceReporter.warning(
                `Failed to run source`,
              );
              sourceReporter.warning(e);
              sourceReporter.warning(
                `Ignore this error, because continueOnError is true.`,
              );
              break;
            } else {
              sourceReporter.error(
                `Failed to run source`,
              );
              throw e;
            }
          }

          // check is need sleep
          if (sourceOptions.sleep && sourceOptions.sleep > 0) {
            sourceReporter.info(
              `Sleep ${sourceOptions.sleep} seconds`,
            );
            await delay(sourceOptions.sleep * 1000);
          }
        }
      }

      // run filter
      const filter = workflow.filter;
      if (filter) {
        ctx.currentStepType = StepType.Filter;
        const filterReporter = getReporter(
          `${ctx.public.workflowRelativePath} -> filter`,
          isDebug,
        );
        let filterOptions = { ...filter };
        try {
          // parse env first
          filterOptions = await parseObject(filter, ctx, {
            keys: ["env"],
          }) as FilterOptions;

          // parse if only
          filterOptions = await parseObject(
            filterOptions,
            ctx,
            {
              keys: ["if", "debug"],
            },
          ) as FilterOptions;

          // set log level
          if (filterOptions?.debug || ctx.public.options?.debug) {
            filterReporter.level = log.LogLevels.DEBUG;
          }

          // check if need to run
          if (filterOptions.if === false) {
            filterReporter.info(
              `Skip this Filter because if condition is false`,
            );
            continue;
          }

          // parse on
          // insert step env
          filterOptions = await parseObject(
            filterOptions,
            {
              ...ctx,
              public: {
                ...ctx.public,
                env: {
                  ...ctx.public.env,
                  ...filterOptions.env,
                },
              },
            },
          ) as FilterOptions;

          // get options
          filterOptions = getDefaultSourceOptions(
            workflowOptions,
            cliWorkflowOptions,
            filterOptions,
          );
          isDebug = filterOptions.debug || false;

          // run Filter
          ctx = await runStep(ctx, {
            reporter: filterReporter,
            ...filterOptions,
          });
          // write items
          if (Array.isArray(ctx.public.result)) {
            ctx.public.items = ctx.public.result;
          } else {
            filterReporter.error(
              `Failed to run filter script`,
            );
            throw new Error(
              `Filter result is not array, which must be an array`,
            );
          }
          if (filterOptions.cmd) {
            const cmdResult = await runCmd(ctx, filterOptions.cmd);
            ctx = setCmdOkResult(ctx, cmdResult.stdout);
          }
          ctx.public.filter = getStepResponse(ctx);

          // run filter
          ctx = filterCtxItems(ctx, {
            ...filterOptions,
            reporter: filterReporter,
          });
        } catch (e) {
          ctx = setErrorResult(ctx, e);
          ctx.public.filter = getStepResponse(ctx);

          if (filter.continueOnError) {
            ctx.public.ok = true;
            filterReporter.warning(
              `Failed to run filter`,
            );
            filterReporter.warning(e);
            filterReporter.warning(
              `Ignore this error, because continueOnError is true.`,
            );
            break;
          } else {
            filterReporter.error(
              `Failed to run filter`,
            );
            throw e;
          }
        }
        // check is need sleep
        if (filterOptions.sleep && filterOptions.sleep > 0) {
          filterReporter.info(
            `Sleep ${filterOptions.sleep} seconds`,
          );
          await delay(filterOptions.sleep * 1000);
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
        ctx.public.item = (ctx.public.items as unknown[])[index];
        if (
          (ctx.public.item as Record<string, string>) &&
          (ctx.public.item as Record<string, string>)["@denoflowKey"]
        ) {
          ctx.public.itemKey =
            (ctx.public.item as Record<string, string>)["@denoflowKey"];
        } else {
          ctx.public.itemKey = undefined;
          workflowReporter.warning(
            `Can not found internal item key \`@denoflowKey\`, maybe you changed the item format. Missing this key, denoflow can not store the unique key state. Fix this, Try not change the reference item, only change the property you need to change. Try to manual adding a \`@denoflowKey\` as item unique key.`,
          );
        }

        if (
          (ctx.public.item as Record<string, number>) &&
          (((ctx.public.item as Record<string, number>)[
              "@denoflowSourceIndex"
            ]) as number) >= 0
        ) {
          ctx.public.itemSourceIndex =
            ((ctx.public.item as Record<string, number>)[
              "@denoflowSourceIndex"
            ]) as number;
          ctx.itemSourceOptions =
            ctx.sourcesOptions[ctx.public.itemSourceIndex];
        } else {
          ctx.itemSourceOptions = undefined;
          workflowReporter.warning(
            `Can not found internal item key \`@denoflowSourceIndex\`, maybe you changed the item format. Try not change the reference item, only change the property you need to change. Try to manual adding a \`@denoflowKey\` as item unique key.`,
          );
        }

        const itemReporter = getReporter(
          `${ctx.public.workflowRelativePath} -> item:${index}`,
          isDebug,
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
            isDebug,
          );
          let stepOptions = { ...step };
          try {
            // parse env first
            stepOptions = await parseObject(stepOptions, ctx, {
              keys: ["env"],
            }) as StepOptions;

            // parse if only
            stepOptions = await parseObject(stepOptions, ctx, {
              keys: ["if", "debug"],
            }) as StepOptions;
            if (stepOptions.debug || ctx.public.options?.debug) {
              stepReporter.level = log.LogLevels.DEBUG;
            }
            if (stepOptions.if === false) {
              stepReporter.info(
                `Skip this step because if condition is false`,
              );
              continue;
            }
            // parse on
            // insert step env
            stepOptions = await parseObject(stepOptions, {
              ...ctx,
              public: {
                ...ctx.public,
                env: {
                  ...ctx.public.env,
                  ...stepOptions.env,
                },
              },
            }) as StepOptions;
            // get options
            stepOptions = getDefaultSourceOptions(
              workflowOptions,
              cliWorkflowOptions,
              stepOptions,
            );
            isDebug = stepOptions.debug || false;

            stepReporter.debug(
              `Start run this step.`,
            );
            ctx = await runStep(ctx, {
              ...stepOptions,
              reporter: stepReporter,
            });
            if (stepOptions.cmd) {
              const cmdResult = await runCmd(ctx, stepOptions.cmd);
              ctx = setCmdOkResult(ctx, cmdResult.stdout);
            }

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
            if (step.continueOnError) {
              ctx.public.ok = true;
              stepReporter.warning(
                `Failed to run step`,
              );
              stepReporter.warning(e);
              stepReporter.warning(
                `Ignore this error, because continueOnError is true.`,
              );
              break;
            } else {
              stepReporter.error(
                `Failed to run step`,
              );
              throw e;
            }
          }
          // this item steps all ok, add unique keys to the internal state

          // check is !force
          // get item source options
          if (ctx.itemSourceOptions && !ctx.itemSourceOptions.force) {
            if (!ctx.internalState || !ctx.internalState.keys) {
              ctx.internalState!.keys = [];
            }
            if (
              ctx.public.itemKey &&
              !ctx.internalState!.keys.includes(ctx.public.itemKey!)
            ) {
              ctx.internalState!.keys.push(ctx.public.itemKey!);
            }
          }
          // check is need sleep
          if (stepOptions.sleep && stepOptions.sleep > 0) {
            stepReporter.info(
              `Sleep ${stepOptions.sleep} seconds`,
            );
            await delay(stepOptions.sleep * 1000);
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
        await ctx.db!.set("state", ctx.public.state);
      } else {
        workflowReporter.debug(`Skip save sate, cause no change happened`);
      }
      if (currentInternalState !== ctx.initInternalState) {
        workflowReporter.debug(
          `Save internal state`,
        );
        await ctx.db!.set("internalState", ctx.internalState);
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
        `Failed to run this workflow`,
      );
      workflowReporter.error(e);
      if (validWorkflows.length > workflowIndex + 1) {
        workflowReporter.info("Skip to run next workflow");
      }
    }
    console.log("\n");
  }
}
