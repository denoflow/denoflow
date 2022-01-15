import { getReporter } from "./report.ts";
export async function hasPermissionSlient(
  permission: Deno.PermissionDescriptor,
): Promise<boolean> {
  const permissionState = await Deno.permissions.query(permission);
  const is = permissionState.state === "granted";
  if (!is) {
    const reporter = await getReporter("permission", false);
    reporter.info(
      `permission denied:${permission.name}, will not read this`,
    );
    return false;
  } else {
    return true;
  }
}
