import { SourceOptions } from "./interface.ts";
import { get } from "./utils/get.js";
import { log } from "../../deps.ts";
import { Context } from "./internal-interface.ts";
import { runScript } from "./utils/run-script.ts";
interface FilterTriggerOption extends SourceOptions {
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
export async function filterSourceItems(
  ctx: Context,
  sourceOptions: FilterTriggerOption,
): Promise<Context> {
  const { reporter } = sourceOptions;
  // format
  const force = sourceOptions?.force;

  const limit = sourceOptions?.limit;
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
    let item = items[itemIndex];
    if (
      limit !== undefined && limit > 0 && finalItems.length >= limit
    ) {
      break;
    }
    const key = getSourceItemUniqueKey(
      item,
      ctx.public.sourceIndex!,
      sourceOptions,
    );
    if (key === undefined) {
      reporter.warning(
        `item has no unique key, will be directly added to items`,
      );
    }

    if (
      key !== undefined && ctx.internalState &&
      (ctx.internalState.keys || []).includes(key) &&
      !force
    ) {
      reporter.debug(`Skip item ${key}, cause it has been processed`);
      continue;
    } else if (force) {
      reporter.info(`added processed item: ${key}, cause --force is true`);
    }
    // format if needed
    if (sourceOptions.format) {
      try {
        const scriptResult = await runScript(sourceOptions.format, {
          ctx: {
            ...ctx.public,
            items: items,
            itemIndex: itemIndex,
            itemKey: key,
            item: item,
          },
        });

        item = scriptResult.result;
        ctx.public.state = scriptResult.ctx.state;
      } catch (e) {
        reporter.error(
          `Failed to run format script`,
        );
        throw new Error(e);
      }
    }
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
    finalItems.push(item);
  }
  // save current key to db
  ctx.public.items = (ctx.public.items || []).concat(finalItems);

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
  const finalItemKeys = [];
  const finalItemSourceOptions = [];
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
