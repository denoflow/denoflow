import { hasPermissionSlient } from "../permission.ts";

export const getEnv = async (): Promise<{
  [index: string]: string;
}> => {
  const allEnvPermmision = { name: "env" } as const;

  if (await hasPermissionSlient(allEnvPermmision)) {
    return Deno.env.toObject();
  } else {
    return {};
  }
};
