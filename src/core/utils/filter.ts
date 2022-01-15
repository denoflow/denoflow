import { filterFiles, getFiles, relative } from "../../../deps.ts";
export function getFilesByFilter(cwd: string, files: string[]) {
  // glob all files
  let relativePath = relative(Deno.cwd(), cwd);
  if (!relativePath.startsWith(".")) {
    relativePath = `./${relativePath}`;
  }

  const allFiles = getFiles({
    root: "./",
    hasInfo: false,
    exclude: [".git", ".github", ".vscode", ".vscode-test", "node_modules"],
  });
  const validSuffix = ["yml", "yaml"];
  // filter only .yml .yaml files
  const allYamlFiles = allFiles.filter((file) =>
    validSuffix.includes(file.ext)
  );
  const matchCondition = files ?? ["workflows"];
  const matchConditionGlob: string[] = [];
  matchCondition.forEach((item) => {
    if (!item.includes("*") && !validSuffix.includes(item)) {
      matchConditionGlob.push(`${item}/**/*`);
      matchConditionGlob.push(`*${item}*`);
      matchConditionGlob.push(`**/**${item}**`);
    } else {
      matchConditionGlob.push(item);
    }
  });

  return filterFiles(allYamlFiles.map((item) => item.path), {
    match: matchConditionGlob,
    ignore: "",
  });
}
