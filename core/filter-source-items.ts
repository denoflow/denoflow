import { Context } from "./internal-interface.ts";
import { getSourceItemUniqueKey } from "./get-source-items-from-result.ts";
import { runScript } from "./utils/run-script.ts";
import { log } from "../deps.ts";
import { getFrom } from "./get-from.ts";
import { PublicContext, SourceOptions } from "./interface.ts";
type FilterFunction = (ctx: PublicContext) => boolean;
interface FilterSourceItemsOption extends SourceOptions {
  reporter: log.Logger;
}
export async function filterSourceItems(
  ctx: Context,
  sourceOptions: FilterSourceItemsOption,
): Promise<Context> {
  const reporter = sourceOptions.reporter;
  let finalItems: unknown[] = ctx.public.items;
  if (Array.isArray(ctx.public.items)) {
    if (sourceOptions.filter) {
      finalItems = [];
      for (let i = 0; i < ctx.public.items.length; i++) {
        const item = ctx.public.items[i];
        try {
          const key = getSourceItemUniqueKey(
            item,
            ctx.public.sourceIndex!,
            sourceOptions,
          );
          const scriptResult = await runScript(sourceOptions.filter, {
            ctx: {
              ...ctx.public,
              itemIndex: i,
              itemKey: key,
              item: item,
            },
          });

          if (scriptResult.result) {
            finalItems.push(item);
            reporter.debug(`filter item ${key} to ctx.items`);
          }
          ctx.public.state = scriptResult.ctx.state;
        } catch (e) {
          reporter.error(
            `Failed to run filter script`,
          );
          throw new Error(e);
        }
      }
    } else if (sourceOptions.filterFrom) {
      finalItems = [];
      const lib = await getFrom(ctx, sourceOptions.filterFrom, reporter);
      if (lib && (lib as Record<string, FilterFunction>).default) {
        for (let i = 0; i < ctx.public.items.length; i++) {
          const item = ctx.public.items[i];
          try {
            const key = getSourceItemUniqueKey(
              item,
              ctx.public.sourceIndex!,
              sourceOptions,
            );
            const scriptResult = await lib.default({
              ...ctx.public,
              itemIndex: i,
              itemKey: key,
              item: item,
            });

            if (scriptResult) {
              finalItems.push(item);
              reporter.debug(`filter item ${key} to ctx.items`);
            }
          } catch (e) {
            reporter.error(
              `Failed to run filterFrom script`,
            );
            throw new Error(e);
          }
        }
      }
    } else if (sourceOptions.filterItems) {
      const filterItems = sourceOptions.filterItems;

      try {
        const scriptResult = await runScript(filterItems, {
          ctx: {
            ...ctx.public,
          },
        });

        if (
          Array.isArray(scriptResult.result) &&
          scriptResult.result.length === ctx.public.items.length
        ) {
          finalItems = ctx.public.items.filter((_item, index) => {
            return scriptResult.result[index];
          });
          reporter.debug(`filter ${finalItems.length} items to ctx.items`);
        } else {
          // invalid result
          throw new Error(
            "Invalid filterItems script code, result must be array , boolean[], which items length must be equal to ctx.items length",
          );
        }
        ctx.public.state = scriptResult.ctx.state;
      } catch (e) {
        reporter.error(
          `Failed to run filterItems script`,
        );
        throw new Error(e);
      }
    } else if (sourceOptions.filterItemsFrom) {
      const lib = await getFrom(ctx, sourceOptions.filterItemsFrom, reporter);
      if (lib && (lib as Record<string, FilterFunction>).default) {
        try {
          const scriptResult = await lib.default({
            ...ctx.public,
          });

          if (
            Array.isArray(scriptResult) &&
            scriptResult.length === ctx.public.items.length
          ) {
            finalItems = ctx.public.items.filter((_item, index) => {
              return scriptResult[index];
            });
            reporter.debug(`filter ${finalItems.length} items to ctx.items`);
          } else {
            // invalid result
            throw new Error(
              "Invalid filterItems script, result must be array , boolean[], which items length must be equal to ctx.items length",
            );
          }
        } catch (e) {
          reporter.error(
            `Failed to run filterItemsFrom script`,
          );
          throw new Error(e);
        }
      }
    }
  }

  ctx.public.items = finalItems;
  ctx.public.result = finalItems;
  return ctx;
}
