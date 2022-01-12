import { Context, Step } from "./interface.ts";
import { template } from "./utils/template.ts";
import mapObject from "https://raw.githubusercontent.com/sindresorhus/map-obj/main/index.js";

export function parseStep(step: Step, ctx: Context): Step {
  const returned = mapObject(
    step,
    (sourceKey: unknown, sourceValue: unknown) => {
      if (typeof sourceValue === "string") {
        const parsed = template(sourceValue, ctx);
        return [sourceKey, parsed, {
          shouldRecurse: false,
        }];
      } else {
        if (Array.isArray(sourceValue)) {
          return [
            sourceKey,
            sourceValue.map((item) => {
              if (typeof item === "string") {
                const parsed = template(item, ctx);
                return parsed;
              } else {
                return item;
              }
            }),
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
