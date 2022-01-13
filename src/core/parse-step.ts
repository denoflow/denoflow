import { Context, Step } from "./interface.ts";
import { template } from "./utils/template.ts";
import mapObject from "./utils/map-obj.js";

export async function parseStep(step: Step, ctx: Context): Promise<Step> {
  const returned = await mapObject(
    step,
    async (sourceKey: string, sourceValue: unknown) => {
      if (typeof sourceValue === "string") {
        const parsed = await template(sourceValue, ctx.public);

        return [sourceKey, parsed, {
          shouldRecurse: false,
        }];
      } else {
        if (Array.isArray(sourceValue)) {
          const finalArray = [];
          for (let i = 0; i < sourceValue.length; i++) {
            const item = sourceValue[i];

            if (typeof item === "string") {
              const parsed = await template(item, ctx.public);
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
