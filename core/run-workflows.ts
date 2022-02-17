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
import { isRemotePath } from "./utils/path.ts";
import { getStepResponse, runStep, setErrorResult } from "./run-step.ts";
import {
  filterCtxItems,
  getSourceItemsFromResult,
} from "./get-source-items-from-result.ts";
import {
  config,
  delay,
  dirname,
  join,
  log,
  relative,
  SqliteDb,
} from "../deps.ts";
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
import { runAssert } from "./run-assert.ts";

interface ValidWorkflow {
  ctx: Context;
  workflow: WorkflowOptions;
}

const parse1Keys = ["env"];
const parse2Keys = ["if", "debug"];
const parse3ForGeneralKeys = [
  "if",
  "debug",
  "database",
  "sleep",
  "limit",
  "force",
];
const parse3ForStepKeys = [
  "id",
  "from",
  "use",
  "args",
];
const parse4ForSourceKeys = [
  "force",
  "itemsPath",
  "key",
  "limit",
  "reverse",
];

const parse6ForSourceKeys = [
  "filterFrom",
  "filterItemsFrom",
];
const parse7ForSourceKeys = [
  "cmd",
];

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
    content,
  } = cliWorkflowOptions;
  let workflowFiles: string[] = [];
  const cwd = Deno.cwd();
  if (content) {
    workflowFiles = [];
  } else {
    workflowFiles = await getFilesByFilter(cwd, files);
  }

  let env = {};

  const allEnvPermmision = { name: "env" } as const;

  // first try to get .env
  const dotEnvFilePermmision = {
    name: "read",
    path: ".env,.env.defaults,.env.example",
  } as const;

  if (await hasPermissionSlient(dotEnvFilePermmision)) {
    env = config();
  }

  if (await hasPermissionSlient(allEnvPermmision)) {
    env = {
      ...env,
      ...Deno.env.toObject(),
    };
  }

  // get options
  let validWorkflows: ValidWorkflow[] = [];

  // if stdin

  if (content) {
    const workflow = parseWorkflow(content);

    if (isObject(workflow)) {
      const workflowFilePath = "/tmp/denoflow/tmp-workflow.yml";
      const workflowRelativePath = relative(cwd, workflowFilePath);
      validWorkflows.push({
        ctx: {
          public: {
            env,
            workflowPath: workflowFilePath,
            workflowRelativePath,
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
    }
  }

  const errors = [];
  for (let i = 0; i < workflowFiles.length; i++) {
    const workflowRelativePath = workflowFiles[i];
    let fileContent = "";
    let workflowFilePath = "";
    if (isRemotePath(workflowRelativePath)) {
      const netContent = await fetch(workflowRelativePath);
      workflowFilePath = workflowRelativePath;
      fileContent = await netContent.text();
    } else {
      workflowFilePath = join(cwd, workflowRelativePath);
      fileContent = await getContent(workflowFilePath);
    }

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
    ` ${validWorkflows.length} valid workflows:\n${
      validWorkflows.map((item) => getReporterName(item.ctx)).join(
        "\n",
      )
    }\n`,
    "Success found",
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
      keys: parse1Keys,
    }) as WorkflowOptions;
    // run env
    // parse env to env
    if (parsedWorkflowFileOptionsWithEnv.env) {
      for (const key in parsedWorkflowFileOptionsWithEnv.env) {
        const value = parsedWorkflowFileOptionsWithEnv.env[key];
        if (typeof value === "string") {
          const debugEnvPermmision = { name: "env", variable: key } as const;
          if (await hasPermissionSlient(debugEnvPermmision)) {
            Deno.env.set(key, value);
          }
        }
      }
    }

    // parse general options

    const parsedWorkflowGeneralOptionsWithGeneral = await parseObject(
      parsedWorkflowFileOptionsWithEnv,
      ctx,
      {
        keys: parse3ForGeneralKeys,
      },
    ) as WorkflowOptions;

    const workflowOptions = getFinalWorkflowOptions(
      parsedWorkflowGeneralOptionsWithGeneral ||
        {},
      cliWorkflowOptions,
    );
    isDebug = workflowOptions.debug || false;

    const workflowReporter = getReporter(
      `${getReporterName(ctx)}`,
      isDebug,
    );

    // check if need to run
    if (workflowOptions?.if === false) {
      workflowReporter.info(
        `because if condition is false`,
        "Skip workflow",
      );
      continue;
    } else {
      workflowReporter.info(
        ``,
        "Start handle workflow",
      );
    }

    // merge to get default
    ctx.public.options = workflowOptions;

    const database = workflowOptions.database as string;
    let db;

    if (database?.startsWith("sqlite")) {
      db = new SqliteDb(database);
    } else {
      let namespace = ctx.public.workflowRelativePath;
      if (namespace.startsWith("..")) {
        // use absolute path as namespace
        namespace = `@denoflowRoot${ctx.public.workflowPath}`;
      }

      db = new Keydb(database, {
        namespace: namespace,
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
        workflowReporter.info("", "Start get sources");
        for (let sourceIndex = 0; sourceIndex < sources.length; sourceIndex++) {
          const source = sources[sourceIndex];
          ctx.public.sourceIndex = sourceIndex;
          const sourceReporter = getReporter(
            `${getReporterName(ctx)} -> source:${ctx.public.sourceIndex}`,
            isDebug,
          );
          let sourceOptions = {
            ...source,
          };
          try {
            // parse env first
            sourceOptions = await parseObject(source, ctx, {
              keys: parse1Keys,
            }) as SourceOptions;

            // parse if only
            sourceOptions = await parseObject(
              sourceOptions,
              ctx,
              {
                keys: parse2Keys,
              },
            ) as SourceOptions;

            // set log level
            if (sourceOptions?.debug || ctx.public.options?.debug) {
              sourceReporter.level = log.LogLevels.DEBUG;
            }

            // check if need to run
            if (sourceOptions.if === false) {
              sourceReporter.info(
                `because if condition is false`,
                "Skip source",
              );
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
              {
                keys: parse3ForStepKeys,
              },
            ) as SourceOptions;

            // get options
            sourceOptions = getFinalSourceOptions(
              workflowOptions,
              cliWorkflowOptions,
              sourceOptions,
            );
            isDebug = sourceOptions.debug || false;

            // check if
            if (sourceOptions.if === false) {
              ctx.public.result = undefined;
              ctx.public.ok = true;
              ctx.public.error = undefined;
              ctx.public.cmdResult = undefined;
              ctx.public.cmdCode = undefined;
              ctx.public.cmdOk = true;
              ctx.public.isRealOk = true;
              ctx.public.sources[sourceIndex] = getStepResponse(ctx);
              if (sourceOptions.id) {
                ctx.public.sources[sourceOptions.id] =
                  ctx.public.sources[sourceIndex];
              }
              continue;
            }
            // run source
            ctx = await runStep(ctx, {
              reporter: sourceReporter,
              ...sourceOptions,
            });

            // parse4
            sourceOptions = await parseObject(sourceOptions, ctx, {
              keys: parse4ForSourceKeys,
            }) as SourceOptions;

            // get source items by itemsPath, key
            ctx = await getSourceItemsFromResult(ctx, {
              ...sourceOptions,
              reporter: sourceReporter,
            });

            // parse6

            sourceOptions = await parseObject(sourceOptions, ctx, {
              keys: parse6ForSourceKeys,
            }) as SourceOptions;
            // run user filter, filter from, filterItems, filterItemsFrom, only allow one.
            ctx = await filterSourceItems(ctx, {
              reporter: sourceReporter,
              ...sourceOptions,
            });

            // run cmd

            if (sourceOptions.cmd) {
              sourceOptions = await parseObject(sourceOptions, ctx, {
                keys: parse7ForSourceKeys,
              }) as SourceOptions;
              const cmdResult = await runCmd(ctx, sourceOptions.cmd as string);
              ctx = setCmdOkResult(ctx, cmdResult.stdout);
            }

            // mark source items, add unique key and source index to items
            ctx = markSourceItems(ctx, sourceOptions);
            ctx.public.sources[sourceIndex] = getStepResponse(ctx);
            if (sourceOptions.id) {
              ctx.public.sources[sourceOptions.id] =
                ctx.public.sources[sourceIndex];
            }

            // run assert
            if (sourceOptions.assert) {
              ctx = await runAssert(ctx, {
                reporter: sourceReporter,
                ...sourceOptions,
              });
            }
            if (ctx.public.items.length > 0) {
              // run post
              sourceReporter.info(
                "",
                `Source ${sourceIndex} get ${ctx.public.items.length} items`,
              );
            }

            if (sourceOptions.post) {
              await runPost(ctx, {
                reporter: sourceReporter,
                ...sourceOptions,
              });
            }
            ctx.sourcesOptions.push(sourceOptions);
          } catch (e) {
            ctx = setErrorResult(ctx, e);
            ctx.public.sources[sourceIndex] = getStepResponse(ctx);
            if (source.id) {
              ctx.public.sources[source.id] = ctx.public.sources[sourceIndex];
            }
            if (source.continueOnError) {
              ctx.public.ok = true;
              sourceReporter.warning(
                `Failed run source`,
              );
              sourceReporter.warning(e);
              sourceReporter.warning(
                `Ignore this error, because continueOnError is true.`,
              );
              break;
            } else {
              sourceReporter.error(
                `Failed run source`,
              );
              throw e;
            }
          }
          // parse 8 sleep
          sourceOptions = await parseObject(sourceOptions, ctx, {
            keys: ["sleep"],
          }) as SourceOptions;

          // check is need sleep
          if (sourceOptions.sleep && sourceOptions.sleep > 0) {
            sourceReporter.info(
              `${sourceOptions.sleep} seconds`,
              "Sleep",
            );
            await delay(sourceOptions.sleep * 1000);
          }
        }
      }

      // insert new ctx.items
      if (sources) {
        let collectCtxItems: unknown[] = [];
        sources.forEach((_, theSourceIndex) => {
          if (Array.isArray(ctx.public.sources[theSourceIndex].result)) {
            collectCtxItems = collectCtxItems.concat(
              ctx.public.sources[theSourceIndex].result,
            );
          }
        });
        ctx.public.items = collectCtxItems;
        if (ctx.public.items.length > 0) {
          workflowReporter.info(
            `Total ${ctx.public.items.length} items`,
            "Finish get sources",
          );
        }
      }

      // if items >0, then continue
      if ((ctx.public.items as unknown[]).length === 0) {
        // no need to handle steps
        workflowReporter.info(
          `because no any valid sources items returned`,
          "Skip workflow",
        );
        continue;
      }

      // run filter
      const filter = workflow.filter;
      if (filter) {
        ctx.currentStepType = StepType.Filter;
        const filterReporter = getReporter(
          `${getReporterName(ctx)} -> filter`,
          isDebug,
        );
        let filterOptions = { ...filter };
        try {
          // parse env first
          filterOptions = await parseObject(filter, ctx, {
            keys: parse1Keys,
          }) as FilterOptions;

          // parse if debug only
          filterOptions = await parseObject(
            filterOptions,
            ctx,
            {
              keys: parse2Keys,
            },
          ) as FilterOptions;

          // set log level
          if (filterOptions?.debug || ctx.public.options?.debug) {
            filterReporter.level = log.LogLevels.DEBUG;
          }

          // check if need to run
          if (filterOptions.if === false) {
            filterReporter.info(
              `because if condition is false`,
              "Skip filter",
            );
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
            {
              keys: parse3ForStepKeys,
            },
          ) as FilterOptions;

          // get options
          filterOptions = getFinalSourceOptions(
            workflowOptions,
            cliWorkflowOptions,
            filterOptions,
          );
          isDebug = filterOptions.debug || false;
          if (filterOptions.if === false) {
            continue;
          }
          filterReporter.info("", "Start handle filter");
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
            filterOptions = await parseObject(filterOptions, ctx, {
              keys: ["cmd"],
            }) as FilterOptions;
            const cmdResult = await runCmd(ctx, filterOptions.cmd as string);
            ctx = setCmdOkResult(ctx, cmdResult.stdout);
          }
          ctx.public.filter = getStepResponse(ctx);
          // parse limit
          filterOptions = await parseObject(filterOptions, ctx, {
            keys: ["limit"],
          }) as FilterOptions;
          // run filter
          ctx = filterCtxItems(ctx, {
            ...filterOptions,
            reporter: filterReporter,
          });

          // run assert
          if (filterOptions.assert) {
            ctx = await runAssert(ctx, {
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
        filterReporter.info(
          `Total ${ctx.public.items.length} items`,
          "Finish handle filter",
        );

        // check is need sleep
        // parse sleep
        filterOptions = await parseObject(filterOptions, ctx, {
          keys: ["sleep"],
        }) as FilterOptions;
        if (filterOptions.sleep && filterOptions.sleep > 0) {
          filterReporter.info(
            `${filterOptions.sleep} seconds`,
            "Sleep",
          );
          await delay(filterOptions.sleep * 1000);
        }
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
        } else if (isObject(ctx.public.item)) {
          ctx.public.itemKey = undefined;
          workflowReporter.warning(
            `Can not found internal item key \`@denoflowKey\`, maybe you changed the item format. Missing this key, denoflow can not store the unique key state. Fix this, Try not change the reference item, only change the property you need to change. Try to manual adding a \`@denoflowKey\` as item unique key.`,
          );
        } else {
          ctx.public.itemKey = undefined;
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
        } else if (isObject(ctx.public.item)) {
          ctx.itemSourceOptions = undefined;
          workflowReporter.warning(
            `Can not found internal item key \`@denoflowSourceIndex\`, maybe you changed the item format. Try not change the reference item, only change the property you need to change. Try to manual adding a \`@denoflowKey\` as item unique key.`,
          );
        } else {
          ctx.itemSourceOptions = undefined;
        }

        const itemReporter = getReporter(
          `${getReporterName(ctx)} -> item:${index}`,
          isDebug,
        );
        if (ctx.public.options?.debug) {
          itemReporter.level = log.LogLevels.DEBUG;
        }

        if (!workflow.steps) {
          workflow.steps = [];
        } else {
          itemReporter.info(
            ``,
            "Start run steps",
          );
          itemReporter.debug(`${JSON.stringify(ctx.public.item, null, 2)}`);
        }

        for (let j = 0; j < workflow.steps.length; j++) {
          const step = workflow.steps[j];
          ctx.public.stepIndex = j;
          const stepReporter = getReporter(
            `${getReporterName(ctx)} -> step:${ctx.public.stepIndex}`,
            isDebug,
          );
          let stepOptions = { ...step };
          try {
            // parse env first
            stepOptions = await parseObject(stepOptions, ctx, {
              keys: parse1Keys,
            }) as StepOptions;

            // parse if only
            stepOptions = await parseObject(stepOptions, ctx, {
              keys: parse2Keys,
            }) as StepOptions;
            if (stepOptions.debug || ctx.public.options?.debug) {
              stepReporter.level = log.LogLevels.DEBUG;
            }
            if (stepOptions.if === false) {
              stepReporter.info(
                `because if condition is false`,
                "Skip step",
              );
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
            }, {
              keys: parse3ForStepKeys,
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

            if (stepOptions.if === false) {
              ctx.public.result = undefined;
              ctx.public.ok = true;
              ctx.public.error = undefined;
              ctx.public.cmdResult = undefined;
              ctx.public.cmdCode = undefined;
              ctx.public.cmdOk = true;
              ctx.public.isRealOk = true;
              ctx.public.steps[j] = getStepResponse(ctx);
              if (step.id) {
                ctx.public.steps[step.id] = ctx.public.steps[j];
              }
              continue;
            }

            ctx = await runStep(ctx, {
              ...stepOptions,
              reporter: stepReporter,
            });
            if (stepOptions.cmd) {
              // parse cmd

              stepOptions = await parseObject(stepOptions, {
                ...ctx,
                public: {
                  ...ctx.public,
                  env: {
                    ...ctx.public.env,
                    ...stepOptions.env,
                  },
                },
              }, {
                keys: ["cmd"],
              }) as StepOptions;
              const cmdResult = await runCmd(ctx, stepOptions.cmd as string);
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
          stepReporter.info("", "Finish run step " + j);

          // parse sleep
          stepOptions = await parseObject(stepOptions, ctx, {
            keys: ["sleep"],
          }) as StepOptions;

          // check is need sleep
          if (stepOptions.sleep && stepOptions.sleep > 0) {
            stepReporter.info(
              `${stepOptions.sleep} seconds`,
              "Sleep",
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
            ctx.internalState!.keys = ctx.internalState!.keys.slice(0, 1000);
          }
        }
        if (workflow.steps.length > 0) {
          itemReporter.info(
            ``,
            `Finish run steps`,
          );
        }
      }

      // run post step
      const post = workflow.post;
      if (post) {
        const postReporter = getReporter(
          `${getReporterName(ctx)} -> post`,
          isDebug,
        );
        let postOptions = { ...post };
        try {
          // parse env first
          postOptions = await parseObject(postOptions, ctx, {
            keys: parse1Keys,
          }) as StepOptions;

          // parse if only
          postOptions = await parseObject(postOptions, ctx, {
            keys: parse2Keys,
          }) as StepOptions;
          if (postOptions.debug || ctx.public.options?.debug) {
            postReporter.level = log.LogLevels.DEBUG;
          }
          if (postOptions.if === false) {
            postReporter.info(
              `because if condition is false`,
              "Skip post",
            );
            continue;
          }
          // parse on
          // insert step env
          postOptions = await parseObject(postOptions, {
            ...ctx,
            public: {
              ...ctx.public,
              env: {
                ...ctx.public.env,
                ...postOptions.env,
              },
            },
          }, {
            keys: parse3ForStepKeys,
          }) as StepOptions;
          // get options
          postOptions = getFinalSourceOptions(
            workflowOptions,
            cliWorkflowOptions,
            postOptions,
          );
          isDebug = postOptions.debug || false;

          postReporter.info(
            `Start run post.`,
          );
          // console.log('ctx2',ctx);

          ctx = await runStep(ctx, {
            ...postOptions,
            reporter: postReporter,
          });
          if (postOptions.cmd) {
            // parse cmd
            postOptions = await parseObject(postOptions, ctx, {
              keys: ["cmd"],
            }) as StepOptions;
            const cmdResult = await runCmd(ctx, postOptions.cmd as string);
            ctx = setCmdOkResult(ctx, cmdResult.stdout);
          }

          postReporter.debug(
            `Finish to run post.`,
          );
        } catch (e) {
          if (post.continueOnError) {
            ctx.public.ok = true;
            postReporter.warning(
              `Failed to run post`,
            );
            postReporter.warning(e);
            postReporter.warning(
              `Ignore this error, because continueOnError is true.`,
            );
            break;
          } else {
            postReporter.error(
              `Failed to run post`,
            );
            throw e;
          }
        }
        // this item steps all ok, add unique keys to the internal state

        // run assert
        if (postOptions.assert) {
          await runAssert(ctx, {
            reporter: postReporter,
            ...postOptions,
          });
        }

        if (postOptions.post) {
          await runPost(ctx, {
            reporter: postReporter,
            ...postOptions,
          });
        }
        postReporter.info("", "Finish run post ");

        // parse sleep
        postOptions = await parseObject(postOptions, ctx, {
          keys: ["sleep"],
        }) as StepOptions;
        // check is need sleep
        if (postOptions.sleep && postOptions.sleep > 0) {
          postReporter.info(
            `${postOptions.sleep} seconds`,
            "Sleep",
          );
          await delay(postOptions.sleep * 1000);
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
        // workflowReporter.debug(`Skip save sate, cause no change happened`);
      }
      if (currentInternalState !== ctx.initInternalState) {
        workflowReporter.debug(
          `Save internal state`,
        );
        await ctx.db!.set("internalState", ctx.internalState);
      } else {
        // workflowReporter.debug(
        //   `Skip save internal state, cause no change happened`,
        // );
      }
      workflowReporter.info(
        ``,
        "Finish workflow",
      );
    } catch (e) {
      workflowReporter.error(
        `Failed to run this workflow`,
      );

      workflowReporter.error(e);
      if (validWorkflows.length > workflowIndex + 1) {
        workflowReporter.debug("workflow", "Start next workflow");
      }
      errors.push({
        ctx,
        error: e,
      });
    }
    console.log("\n");
  }
  if (errors.length > 0) {
    report.error("Error details:");
    errors.forEach((error) => {
      report.error(
        `Run ${getReporterName(error.ctx)} failed, error: `,
      );
      report.error(error.error);
    });

    throw new Error(`Failed to run this time`);
  }
}

function getReporterName(ctx: Context) {
  const relativePath = ctx.public.workflowRelativePath;
  const absolutePath = ctx.public.workflowPath;
  if (relativePath.startsWith("..")) {
    return absolutePath;
  } else {
    return relativePath;
  }
}
