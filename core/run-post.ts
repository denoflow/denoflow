import { StepOptions } from "./interface.ts";
import { Context } from "./internal-interface.ts";
import { log } from "../deps.ts";
import { runScript } from "./utils/run-script.ts";

interface RunStepOption extends StepOptions {
  reporter: log.Logger;
}

export async function runPost(
  ctx: Context,
  step: RunStepOption,
): Promise<Context> {
  const { reporter } = step;
  // check if post
  if (step.post) {
    // run post
    try {
      const scriptResult = await runScript(step.post, {
        ctx: ctx.public,
      });
      ctx.public.state = scriptResult.ctx.state;
    } catch (e) {
      reporter.warning(
        `Failed to run post script code`,
      );
      throw new Error(e);
    }
  }
  return ctx;
}
