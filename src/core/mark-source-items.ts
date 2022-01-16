import { Context } from "./internal-interface.ts";
import { getSourceItemUniqueKey } from "./get-source-items-from-result.ts";

export function markSourceItems(
  ctx: Context,
): Context {
  if (Array.isArray(ctx.public.items)) {
    const sourceOptions = ctx.sourcesOptions[ctx.public.sourceIndex!];
    ctx.public.items = ctx.public.items.map((item) => {
      const key = getSourceItemUniqueKey(
        item,
        ctx.public.sourceIndex!,
        sourceOptions,
      );
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
      return item;
    });
    ctx.public.result = ctx.public.items;
  }
  return ctx;
}
