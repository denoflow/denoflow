import { isLocalPath } from "./utils/path.ts";
import { log, resolve } from "../deps.ts";
import { Context } from "./internal-interface.ts";

export async function getFrom(
  ctx: Context,
  from: string,
  reporter: log.Logger,
) {
  const isUseLocalPath = isLocalPath(from);
  let modulePath = from;
  if (isUseLocalPath) {
    // get relative path base pwd
    const absolutePath = resolve(ctx.public.workflowCwd, from);
    modulePath = `file://${absolutePath}`;
    reporter.debug(`import module from local path: ${modulePath}`);
  }
  const lib = await import(modulePath);
  return lib;
}
