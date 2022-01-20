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
import {
  filterCtxItems,
  getSourceItemsFromResult,
} from "./get-source-items-from-result.ts";
import { delay, dirname, join, log, SqliteDb } from "../../deps.ts";
import report, { getReporter } from "./report.ts";
import { Keydb } from "./adapters/json-store-adapter.ts";
import { filterSourceItems } from "./filter-source-items.ts";
import { markSourceItems } from "./mark-source-items.ts";
import { runCmd, setCmdOkResult } from "./run-cmd.ts";
import {
  getFinalRunOptions,
  getFinalSourceOptions,
  getFinalWorkflowOptions,
} from "./default-options.ts";
import { runPost } from "./run-post.ts";
import {runAssert} from './run-assert.ts';
interface ValidWorkflow {
  ctx: Context;
  workflow: WorkflowOptions;
}

export async function run(runOptions: RunWorkflowOptions) {
  const debugEnvPermmision = { name: "env", variable: "DEBUG" } as const;
  const dataPermission = { name: "read", path: "data" } as const;
  let DebugEnvValue = undefined;
  if (await hasPermissionSlient(debugEnvPermmision)) {
    DebugEnvValue = Deno.env.get("DEBUG");
  }
  let isDebug = !!(DebugEnvValue !== undefined && DebugEnvValue !== "false");

  const cliWorkflowOptions = getFinalRunOptions(runOptions, isDebug);
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
  let validWorkflows: ValidWorkflow[] = [];
  const errors = [];
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
  // sort by alphabet
  validWorkflows = validWorkflows.sort((a, b) => {
    const aPath = a.ctx.public.workflowRelativePath;
    const bPath = b.ctx.public.workflowRelativePath;
    if (aPath < bPath) {
      return -1;
    }
    if (aPath > bPath) {
      return 1;
    }
    return 0;
  });
  report.info(
    `Found ${validWorkflows.length} valid workflows:\n${
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
        keys: ["if", "debug", "database", "sleep", "limit", "force"],
      },
    ) as WorkflowOptions;

    const workflowOptions = getFinalWorkflowOptions(
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
            sourceOptions = getFinalSourceOptions(
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

            // get source items by itemsPath, key
            ctx = await getSourceItemsFromResult(ctx, {
              ...sourceOptions,
              reporter: sourceReporter,
            });

            // run user filter, filter from, filterItems, filterItemsFrom, only allow one.
            ctx = await filterSourceItems(ctx, sourceReporter);

            // run cmd

            if (sourceOptions.cmd) {
              const cmdResult = await runCmd(ctx, sourceOptions.cmd);
              ctx = setCmdOkResult(ctx, cmdResult.stdout);
            }

            if(sourceOptions.reverse){
              // reverse
              ctx.public.items = ctx.public.items.reverse();
            }

            // mark source items, add unique key and source index to items
            ctx = markSourceItems(ctx);
            ctx.public.sources[sourceIndex] = getStepResponse(ctx);
            if (sourceOptions.id) {
              ctx.public.sources[sourceOptions.id] =
                ctx.public.sources[sourceIndex];
            }

            // run assert
            if (sourceOptions.assert) {
              ctx = await runAssert(ctx,{
                reporter: sourceReporter,
                ...sourceOptions,
              });
            }
            // run post

            if (sourceOptions.post) {
              await runPost(ctx, {
                reporter: sourceReporter,
                ...sourceOptions,
              });
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

      // insert new ctx.items
      if (sources) {
        let collectCtxItems: unknown[] = [];
        sources.forEach((_, theSourceIndex) => {
          collectCtxItems = collectCtxItems.concat(
            ctx.public.sources[theSourceIndex].result,
          );
        });
        ctx.public.items = collectCtxItems;
      }

      // if items >0, then continue
      if ((ctx.public.items as unknown[]).length === 0) {
        // no need to handle steps
        workflowReporter.info(
          `Skip this workflow because no any valid sources items returned`,
        );
        continue;
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

          // parse if debug only
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
          filterOptions = getFinalSourceOptions(
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
          if (
            Array.isArray(ctx.public.result) &&
            ctx.public.result.length === ctx.public.items.length
          ) {
            ctx.public.items = ctx.public.items.filter((_item, index) => {
              return !!((ctx.public.result as boolean[])[index]);
            });
            ctx.public.result = ctx.public.items;
          } else if (filterOptions.run || filterOptions.use) {
            // if run or use, then result must be array
            filterReporter.error(
              `Failed to run filter script`,
            );
            // invalid result
            throw new Error(
              "Invalid filter step result, result must be array , boolean[], which array length must be equal to ctx.items length",
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

          // run assert
          if (filterOptions.assert) {
            ctx = await runAssert(ctx,{
              reporter: filterReporter,
              ...filterOptions,
            });
          }

          // run post

          if (filterOptions.post) {
            await runPost(ctx, {
              reporter: filterReporter,
              ...filterOptions,
            });
          }

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
      if ((ctx.public.items as unknown[]).length> 0) {
        workflowReporter.info(
          `Start to run steps, will handle ${
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
        
      
        if(!workflow.steps){
          workflow.steps = [];
        }else{
            itemReporter.info(
          `Start to handle this item`,
        );
        }

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
            stepOptions = getFinalSourceOptions(
              workflowOptions,
              cliWorkflowOptions,
              stepOptions,
            );
            isDebug = stepOptions.debug || false;

            stepReporter.debug(
              `Start run this step.`,
            );
            // console.log('ctx2',ctx);

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

       
          // run assert
          if (stepOptions.assert) {
            await runAssert(ctx, {
              reporter: stepReporter,
              ...stepOptions,
            });
          }

          if (stepOptions.post) {
            await runPost(ctx, {
              reporter: stepReporter,
              ...stepOptions,
            });
          }
          // check is need sleep
          if (stepOptions.sleep && stepOptions.sleep > 0) {
            stepReporter.info(
              `Sleep ${stepOptions.sleep} seconds`,
            );
            await delay(stepOptions.sleep * 1000);
          }
        }
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
            ctx.internalState!.keys.unshift(ctx.public.itemKey!);
          }
          // only save 1000 items for save memory
          if (ctx.internalState!.keys.length > 1000) {
            ctx.internalState!.keys = ctx.internalState!.keys.slice(0,1000);
          }
        }
        if(workflow.steps.length>0){
        itemReporter.info(
          `Finish to run with this item`,
        );
        }
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
      errors.push({
        ctx,
        error:e
      });
    }
    console.log("\n");
  }
  if (errors.length > 0) {

    errors.forEach(error=>{
      report.error(`Run ${error.ctx.public.workflowRelativePath} failed, error: ${error.error} `);
    })

    throw new Error(`Failed to run this time`);
  }
}
