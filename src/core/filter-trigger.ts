import { Context, InternalTriggerResult, Trigger } from "./interface.ts";
import get from "https://raw.githubusercontent.com/lodash/lodash/4.17.21-es/get.js";
export function filterTrigger(
  ctx: Context,
  on: Trigger,
): Context {
  // format
  // get items path, get deduplication key
  let items = ctx.result;
  if (on.itemsPath) {
    items = get(ctx.result as Record<string, unknown>, on.itemsPath);
  }
  if (!Array.isArray(items)) {
    throw new Error("trigger result must be an array, but got " + typeof items);
  }

  const finalItems = [];
  for (const item of items as Record<string, unknown>[]) {
    // unique key
    const uniqueKey = get(item, on.uniqueKey ?? "id");
    if (ctx.internalState.uniqueKeys.includes(uniqueKey)) {
      continue;
    } else {
      ctx.internalState.uniqueKeys.push(uniqueKey);
    }
    finalItems.push(item);
  }
  // save current key to db
  ctx.items = finalItems;
  return ctx;
}
