import { Context, Step } from "./interface.ts";
import { template } from "./utils/template.ts";
import mapObject from "./utils/map-obj.js";
interface StepParseOptions {
  onlyEnv?: boolean;
  onlyIf?: boolean;
}
export async function parseStep(
  step: Step,
  ctx: Context,
  options?: StepParseOptions,
): Promise<Step> {
  let onlyEnv = false;
  let onlyIf = false;
  if (options && options.onlyEnv !== undefined) {
    onlyEnv = options.onlyEnv;
  } else if (options && options.onlyIf !== undefined) {
    onlyIf = options.onlyIf;
  }
  const returned = await mapObject(
    step,
    async (sourceKey: string, sourceValue: unknown) => {
      if (onlyEnv && sourceKey !== "env") {
        return [sourceKey, sourceValue];
      } else if (onlyIf && (sourceKey !== "if" && sourceKey !== "debug")) {
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
  return returned as Step;
}
