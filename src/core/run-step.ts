import { Context, Step } from "./interface.ts";
import { log, resolve } from "../../deps.ts";
import { isLocalPath } from "./utils/path.ts";
import { get } from "./utils/get.js";
import { runScript } from "./utils/run-script.ts";
interface RunStepOption {
  reporter: log.Logger;
}
export async function runStep(
  ctx: Context,
  step: Step,
  options: RunStepOption,
): Promise<Context> {
  const isStep = ctx.public.stepIndex !== undefined;
  const { reporter } = options;

  if (isStep) {
    reporter.debug(
      `Receive Item: ${JSON.stringify(ctx.public.item, null, 2)}`,
    );
  }

  // parse env to env
  if (step.env) {
    for (const key in step.env) {
      const value = step.env[key];
      if (typeof value === "string") {
        Deno.env.set(key, value);
      }
    }
  }

  const from = step.from;
  let use;
  if (from) {
    const isUseLocalPath = isLocalPath(from);
    let modulePath = from;
    if (isUseLocalPath) {
      modulePath = resolve(ctx.public.workflowCwd, from);
      reporter.debug(`import module from local path: ${modulePath}`);
    }
    const lib = await import(modulePath);
    use = get(lib, step.use ?? "default");
  } else if (
    step.use &&
    typeof (globalThis as Record<string, unknown>)[step.use] === "function"
  ) {
    // TODO check default app
    use = await (globalThis as Record<string, unknown>)[step.use];
  }

  const args = step.args || [];

  // alias args[0] -> with
  if (args.length === 0 && step.with) {
    args.push(step.with);
  }
  let stepResult;

  // TODO check if promises
  if (typeof use === "function") {
    reporter.debug(
      `Run ${use.name} with args: ${JSON.stringify(args, null, 2)}`,
    );

    stepResult = await use(...args);
    ctx.public.result = stepResult;
    console.log("stepResult", stepResult.status);

    reporter.debug(
      `Use result: ${
        typeof stepResult === "string"
          ? stepResult
          : JSON.stringify(stepResult, null, 2)
      }`,
    );
  } else if (use !== undefined) {
    throw new Error("use must be a function, but got " + typeof use);
  }
  // check if then
  if (step.then) {
    // run then

    const scriptResult = await runScript(step.then, {
      ctx: ctx.public,
    });
    stepResult = scriptResult.result;
    ctx.public.result = stepResult;
    ctx.public.state = scriptResult.ctx.state;
    reporter.debug(
      `Then result: ${
        typeof stepResult === "string"
          ? stepResult
          : JSON.stringify(stepResult, null, 2)
      }`,
    );
  }
  ctx.public.result = stepResult;

  return ctx;
}
