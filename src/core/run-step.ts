import { Context, Step } from "./interface.ts";
import { resolve } from "https://deno.land/std@0.121.0/path/mod.ts";
import { isLocalPath } from "./utils/path.ts";
import get from "https://raw.githubusercontent.com/lodash/lodash/4.17.21-es/get.js";

export async function runStep(
  ctx: Context,
  step: Step,
): Promise<Context> {
  // TODO
  const from = step.from;
  let use;
  if (from) {
    const isUseLocalPath = isLocalPath(from);
    let modulePath = from;
    if (isUseLocalPath) {
      modulePath = resolve(ctx.workflowCwd, from);
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
  // todo check if promises
  if (typeof use === "function") {
    const result = await use(...args);
    // check if then
    if (step.then) {
      // run then
    }
    ctx.result = result;
    return ctx;
  } else {
    throw new Error("use must be a function, but got " + typeof use);
  }
}
