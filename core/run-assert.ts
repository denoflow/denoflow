import { StepOptions } from "./interface.ts";
import { Context } from "./internal-interface.ts";
import { log } from "../deps.ts";
import { runScript } from "./utils/run-script.ts";
import { assert } from "../deps.ts";

interface RunStepOption extends StepOptions {
  reporter: log.Logger;
}

export async function runAssert(
  ctx: Context,
  step: RunStepOption,
): Promise<Context> {
  const { reporter } = step;
  // check if post
  if (step.assert) {
    // run assert
    try {
      const scriptResult = await runScript(
        `
        return DENOFLOW_ASSERT(${step.assert});
      `,
        {
          DENOFLOW_ASSERT: assert,
          ctx: ctx.public,
        },
      );
      ctx.public.state = scriptResult.ctx.state;
    } catch (e) {
      reporter.warning(
        `Failed to run assert script code: ${step.assert}`,
      );
      throw new Error(e);
    }
  }
  return ctx;
}
