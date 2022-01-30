import { Context } from "./internal-interface.ts";
import { SourceOptions } from "./interface.ts";
import { getSourceItemUniqueKey } from "./get-source-items-from-result.ts";
import { isObject } from "./utils/object.ts";
export function markSourceItems(
  ctx: Context,
  sourceOptions: SourceOptions,
): Context {
  if (Array.isArray(ctx.public.items)) {
    ctx.public.items = ctx.public.items.map((item) => {
      const key = getSourceItemUniqueKey(
        item,
        ctx.public.sourceIndex!,
        sourceOptions,
      );
      if (isObject(item)) {
        // Add source index and item key to item
        Object.defineProperty(item, "@denoflowKey", {
          value: key,
          enumerable: false,
          writable: false,
        });
        Object.defineProperty(item, "@denoflowSourceIndex", {
          value: ctx.public.sourceIndex!,
          enumerable: false,
          writable: false,
        });
      }

      return item;
    });
    ctx.public.result = ctx.public.items;
  }
  return ctx;
}
