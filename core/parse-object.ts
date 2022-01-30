import { StepOptions, WorkflowOptions } from "./interface.ts";
import { Context } from "./internal-interface.ts";
import { template } from "./utils/template.ts";
import mapObject from "./utils/map-obj.js";
import { isObject } from "./utils/object.ts";
interface ObjectparseOptions {
  keys?: string[];
}
export async function parseObject(
  step: StepOptions | WorkflowOptions | Record<string, unknown>,
  ctx: Context,
  options?: ObjectparseOptions,
): Promise<unknown> {
  const { keys: rawKeys } = options || {};
  const keys = rawKeys || Object.keys(step);
  // if keys provided, check is include keys

  for (const key of keys) {
    if ((key in step)) {
      const parsed = await parseTopValue(
        (step as Record<string, unknown>)[key],
        ctx,
      );
      (step as Record<string, unknown>)[key] = parsed;
    }
  }

  return step;
}

async function parseTopValue(
  step: unknown,
  ctx: Context,
): Promise<unknown> {
  try {
    if (typeof step === "string") {
      const parsed = await template(step, {
        ctx: ctx.public,
      });
      return parsed;
    } else if (Array.isArray(step)) {
      const finalArray = [];
      for (
        let i = 0;
        i < (step as unknown[]).length;
        i++
      ) {
        const item = (step as unknown[])[i];

        finalArray.push(await parseTopValue(item, ctx));
      }
      return finalArray;
    } else if (isObject(step)) {
      const returned = await mapObject(
        step,
        async (sourceKey: string, sourceValue: unknown) => {
          if (typeof sourceValue === "string") {
            const parsed = await template(sourceValue, {
              ctx: ctx.public,
            });

            return [sourceKey, parsed, {
              shouldRecurse: false,
            }];
          } else {
            if (Array.isArray(sourceValue)) {
              const finalArray = [];
              for (let i = 0; i < sourceValue.length; i++) {
                const item = sourceValue[i];

                if (typeof item === "string") {
                  const parsed = await template(item, {
                    ctx: ctx.public,
                  });
                  finalArray.push(parsed);
                } else {
                  finalArray.push(item);
                }
              }
              return [
                sourceKey,
                finalArray,
              ];
            } else {
              return [sourceKey, sourceValue];
            }
          }
        },
        {
          deep: true,
        },
      );
      return returned;
    } else {
      return step;
    }
  } catch (e) {
    const isReferenced = e instanceof ReferenceError;

    if (isReferenced) {
      e.message = `${e.message} , Did you forget \`ctx.\` ?`;
    }
    throw e;
  }
}
