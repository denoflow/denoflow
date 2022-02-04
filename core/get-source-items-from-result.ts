import { FilterOptions, SourceOptions } from "./interface.ts";
import { get } from "./utils/get.ts";
import { log } from "../deps.ts";
import { Context } from "./internal-interface.ts";
interface FilterTriggerOption extends FilterOptions {
  reporter: log.Logger;
}
interface SourceTriggerOption extends SourceOptions {
  reporter: log.Logger;
}
export function getSourceItemUniqueKey(
  item: unknown,
  sourceIndex: number,
  sourceOptions: SourceOptions,
): string | undefined {
  const defaultKeysFields = [
    "id",
    "guid",
    "_id",
    "objectId",
    "objectID",
    "ID",
    "url",
    "link",
  ];
  const keyFields = sourceOptions.key
    ? [sourceOptions.key].concat(defaultKeysFields)
    : defaultKeysFields;
  // unique key
  let itemKey;
  for (
    let keyFieldIndex = 0;
    keyFieldIndex < keyFields.length;
    keyFieldIndex++
  ) {
    const keyField = keyFields[keyFieldIndex];
    itemKey = get(item, keyField);
    if (typeof itemKey === "string") {
      break;
    }
  }
  const sourcePrefix = sourceOptions.id || sourceIndex;
  if (itemKey) {
    return `${sourcePrefix}${itemKey}`;
  } else {
    return undefined;
  }
}
export function getSourceItemsFromResult(
  ctx: Context,
  sourceOptions: SourceTriggerOption,
): Context {
  const { reporter } = sourceOptions;
  // format
  const force = sourceOptions?.force;

  // get items path, get deduplication key
  let items = ctx.public.result;

  if (sourceOptions.itemsPath) {
    items = get(
      ctx.public.result as Record<string, unknown>,
      sourceOptions.itemsPath,
    );
  }

  if (!Array.isArray(items)) {
    throw new Error("source result must be an array, but got " + typeof items);
  }

  const finalItems = [];
  for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
    // reach max items
    const item = items[itemIndex];

    const key = getSourceItemUniqueKey(
      item,
      ctx.public.sourceIndex!,
      sourceOptions,
    );
    if (key === undefined) {
      reporter.warning(
        `will be directly added to items`,
        "No unique key",
      );
    }

    if (
      key !== undefined && ctx.internalState &&
      (ctx.internalState.keys || []).includes(key) &&
      !force
    ) {
      reporter.debug(`${key}, cause it has been processed`, "Skip item");
      continue;
    } else if (
      key !== undefined && ctx.internalState &&
      (ctx.internalState.keys || []).includes(key) && force
    ) {
      reporter.debug(
        `${key}, cause --force is true`,
        "Add processed item",
      );
    } else if (force) {
      reporter.debug(`${key}`, "add item");
    }

    finalItems.push(item);
  }
  // save current key to db
  ctx.public.items = finalItems;
  ctx.public.result = finalItems;
  return ctx;
}

export function filterCtxItems(
  ctx: Context,
  filterOptions: FilterTriggerOption,
): Context {
  const { reporter } = filterOptions;
  // format
  const limit = filterOptions?.limit;
  // get items path, get deduplication key
  const items = ctx.public.items;

  if (!Array.isArray(items)) {
    throw new Error(
      "ctx.items must be an array, but got " + typeof items + ", filter failed",
    );
  }
  reporter.debug(`Input ${items.length} items`);

  const finalItems = [];

  for (let i = 0; i < items.length; i++) {
    // reach max items

    if (
      limit !== undefined && limit > 0 && finalItems.length >= limit
    ) {
      break;
    }
    const item = items[i];

    finalItems.push(item);
  }
  // save current key to db
  ctx.public.items = finalItems;

  reporter.debug(`Output ${ctx.public.items.length} items`);

  return ctx;
}
