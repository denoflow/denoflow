import { Context, Trigger } from "./interface.ts";
import { get } from "./utils/get.js";
import { log } from "../../deps.ts";

interface FilterTriggerOption {
  reporter: log.Logger;
}
export function filterTrigger(
  ctx: Context,
  on: Trigger,
  options: FilterTriggerOption,
): Context {
  const { reporter } = options;
  // format
  const force = ctx.public.options?.force;
  const maxItems = ctx.public.options?.maxItems;
  // get items path, get deduplication key
  let items = ctx.public.result;

  if (on.itemsPath) {
    items = get(ctx.public.result as Record<string, unknown>, on.itemsPath);
  }

  if (!Array.isArray(items)) {
    throw new Error("trigger result must be an array, but got " + typeof items);
  }

  const finalItems = [];
  for (const item of items as Record<string, unknown>[]) {
    // reach max items

    if (
      maxItems !== undefined && maxItems > 0 && finalItems.length >= maxItems
    ) {
      break;
    }
    // unique key
    const uniqueKey = get(item, on.uniqueKey ?? "id");
    if (
      ctx.internalState.uniqueKeys.includes(uniqueKey) &&
      !force
    ) {
      reporter.debug(`Skip item ${uniqueKey}, cause it has been processed`);
      continue;
    } else if (force !== true) {
      ctx.internalState.uniqueKeys.push(uniqueKey);
    }
    finalItems.push(item);
  }
  // save current key to db
  ctx.public.items = finalItems;
  return ctx;
}
