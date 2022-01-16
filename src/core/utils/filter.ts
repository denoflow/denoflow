import { filterFiles, getFiles, relative } from "../../../deps.ts";
const validSuffix = ["yml", "yaml"];

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
  // filter only .yml .yaml files
  const allYamlFiles = allFiles.filter((file) => validSuffix.includes(file.ext))
    .map((item) => item.path);
  return filterGlobFiles(allYamlFiles, files);
}

export function filterGlobFiles(allYamlFiles: string[], globs?: string[]) {
  const matchCondition = globs ?? ["workflows"];
  const matchConditionGlob: string[] = [];
  const anyMatch: string[] = [];
  matchCondition.forEach((item) => {
    if (!item.includes("*") && !validSuffix.includes(item)) {
      anyMatch.push(item);
    }
    matchConditionGlob.push(item);
  });
  let anyMatchedFiles: string[] = [];
  if (anyMatch.length > 0) {
    anyMatchedFiles = allYamlFiles.filter((file) => {
      let isMatch = false;
      anyMatch.forEach((item) => {
        if (file.includes(item)) {
          isMatch = true;
        }
      });
      return isMatch;
    });
  }
  const globFiles = filterFiles(allYamlFiles, {
    match: matchConditionGlob,
    ignore: "",
  });
  // unique files
  const uniqueFiles = new Set([...anyMatchedFiles, ...globFiles]);
  return Array.from(uniqueFiles);
}
