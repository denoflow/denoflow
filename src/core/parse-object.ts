import { StepOptions } from "./interface.ts";
import { Context } from "./internal-interface.ts";
import { template } from "./utils/template.ts";
import mapObject from "./utils/map-obj.js";
interface ObjectparseOptions {
  keys?: string[];
}
export async function parseObject(
  step: StepOptions,
  ctx: Context,
  options?: ObjectparseOptions,
): Promise<unknown> {
  const { keys: rawKeys } = options || {};
  const keys = rawKeys || [];
  // if keys provided, check is include keys
  if (keys.length > 0) {
    let isExists = false;
    for (const key of keys) {
      if ((key in step)) {
        isExists = true;
      }
    }
    if (!isExists) {
      // both not exist
      return step;
    }
  }
  try {
    const returned = await mapObject(
      step,
      async (sourceKey: string, sourceValue: unknown) => {
        if (keys.length > 0 && keys.includes(sourceKey) === false) {
          return [sourceKey, sourceValue];
        }
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
  } catch (e) {
    const isReferenced = e instanceof ReferenceError;

    if (isReferenced) {
      e.message = `${e.message} , Did you forget \`ctx.\` ?`;
    }
    throw e;
  }
}
