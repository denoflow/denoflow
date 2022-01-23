import { getReporter } from "./report.ts";
export async function hasPermissionSlient(
  permission: Deno.PermissionDescriptor,
): Promise<boolean> {
  const permissionState = await Deno.permissions.query(permission);
  const is = permissionState.state === "granted";
  if (!is) {
    const reporter = await getReporter("permission", false);
    reporter.debug(
      `--allow-${permission.name} flag now set, skip ${permission.name} permission`,
    );
    return false;
  } else {
    return true;
  }
}
