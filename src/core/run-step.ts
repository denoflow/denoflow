import { StepOptions, StepResponse } from "./interface.ts";
import { Context, StepType } from "./internal-interface.ts";
import { log } from "../../deps.ts";
import { get } from "./utils/get.ts";
import { getFrom } from "./get-from.ts";
import { runScript } from "./utils/run-script.ts";

interface RunStepOption extends StepOptions {
  reporter: log.Logger;
}
export function getStepResponse(ctx: Context): StepResponse {
  return {
    result: ctx.public.result,
    ok: ctx.public.ok!,
    isRealOk: ctx.public.isRealOk!,
    error: ctx.public.error,
    cmdResult: ctx.public.cmdResult,
    cmdCode: ctx.public.cmdCode,
    cmdOk: ctx.public.cmdOk,
    cmdError: ctx.public.cmdError,
  };
}
export function setOkResult(ctx: Context, stepResult: unknown): Context {
  ctx.public.result = stepResult;
  ctx.public.ok = true;
  ctx.public.isRealOk = true;
  ctx.public.error = undefined;
  return ctx;
}
export function setErrorResult(ctx: Context, error: unknown): Context {
  ctx.public.result = undefined;
  ctx.public.error = error;
  ctx.public.isRealOk = false;
  ctx.public.ok = false;
  if ((error as Record<string, unknown>).code !== undefined) {
    ctx.public.cmdCode = (error as Record<string, unknown>).code as number;
    ctx.public.cmdError = (error as Record<string, unknown>).message as string;
    ctx.public.cmdOk = false;
    ctx.public.cmdResult = undefined;
  }
  return ctx;
}
export async function runStep(
  ctx: Context,
  step: RunStepOption,
): Promise<Context> {
  const currentStepType = ctx.currentStepType;
  const { reporter } = step;
  // clear temp state
  if (currentStepType === StepType.Source) {
    reporter.debug(
      `Source Options: ${JSON.stringify(step, null, 2)}`,
    );
  } else if (currentStepType === StepType.Filter) {
    reporter.debug(
      `Filter Options: ${JSON.stringify(step, null, 2)}`,
    );
  } else if (currentStepType === StepType.Step) {
    reporter.debug(
      `Step receive item: ${JSON.stringify(ctx.public.item, null, 2)}`,
    );
    reporter.debug(
      `Step Options: ${JSON.stringify(step, null, 2)}`,
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
  let stepResult;

  try {
    const from = step.from;
    let use;
    if (from) {
      const lib = await getFrom(ctx, from, reporter);      
      use = get(lib, step.use ?? "default");
    } else if (
      step.use &&
      typeof (globalThis as Record<string, unknown>)[step.use] === "function"
    ) {
      // TODO check default app
      use = (globalThis as Record<string, unknown>)[step.use];
    }else if(step.use && step.use.startsWith("Deno.")){
      const denoApiMethod = step.use.replace("Deno.", "");
      use = get(Deno, denoApiMethod);
      
    }else if(step.use){
      throw new Error(`${step.use} is not a function`);
    }

    const args = step.args || [];

    // TODO check if promises
    if (typeof use === "function") {
      reporter.debug(
        `Run ${use.name} with args: ${JSON.stringify(args, null, 2)}`,
      );
        
      stepResult = await use(...args);      
      ctx = setOkResult(ctx, stepResult);

      reporter.debug(
        `use: result: ${
          typeof stepResult === "string"
            ? stepResult
            : JSON.stringify(stepResult, null, 2)
        }`,
      );
    } else if (use !== undefined) {
      const e = "`use` must be a function, but got " + typeof use;
      throw new Error(e);
    }
  } catch (e) {
    reporter.warning(
      `Failed to run use`,
    );
    throw new Error(e);
  }

  // check if then
  if (step.run) {
    // run then
    try {
      const scriptResult = await runScript(step.run, {
        ctx: ctx.public,
      });

      stepResult = scriptResult.result;
      ctx = setOkResult(ctx, stepResult);
      ctx.public.state = scriptResult.ctx.state;
      reporter.debug(
        `Run script result: ${
          typeof stepResult === "string"
            ? stepResult
            : JSON.stringify(stepResult, null, 2)
        }`,
      );
    } catch (e) {
      reporter.warning(
        `Failed to run script`,
      );
      throw new Error(e);
    }
  }

  ctx.public.ok = true;
  return ctx;
}
