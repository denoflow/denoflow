import {
  RunWorkflowOptions,
  SourceOptions,
  WorkflowOptions,
} from "./interface.ts";
import { InternalRunWorkflowOptions } from "./internal-interface.ts";
import deepmerge from "https://esm.sh/deepmerge@4.2.2";

const ValidWorkflowFlags = [
  "if",
  "debug",
  "database",
  "sleep",
  "limit",
  "force",
];
const ValidCliWorkflowFlags = ValidWorkflowFlags.concat("files");
function filterValidSourceOptions(
  options: RunWorkflowOptions,
): SourceOptions {
  const { force, limit, debug } = options || {};

  const validSourceOptions: Record<string, unknown> = {
    force,
    limit,
    debug,
  };
  Object.keys(validSourceOptions).forEach((key) =>
    validSourceOptions[key] === undefined && delete validSourceOptions[key]
  );

  return validSourceOptions;
}
function filterValidCliOptions(
  options: RunWorkflowOptions,
): RunWorkflowOptions {
  const validWorkflowOptions: RunWorkflowOptions = {};
  ValidCliWorkflowFlags.forEach((key) => {
    if (key in options) {
      validWorkflowOptions[key] = options[key];
    }
  });
  return validWorkflowOptions;
}
function filterValidWorkflowOptions(
  options: WorkflowOptions,
): WorkflowOptions {
  const validWorkflowOptions: WorkflowOptions = {};

  ValidWorkflowFlags.forEach((key) => {
    if (key in options) {
      validWorkflowOptions[key] = options[key];
    }
  });

  return validWorkflowOptions;
}
export function getFinalWorkflowOptions(
  WorkflowOptions: WorkflowOptions,
  runWorkflowOptions: RunWorkflowOptions,
): WorkflowOptions {
  let database = "json://data";
  if (runWorkflowOptions.content) {
    database = "json:///tmp/denoflow/data";
  }
  const defaultOptions: WorkflowOptions = {
    debug: false,
    database: database,
    if: true,
  };
  const finalOptions: WorkflowOptions = mergeAll([
    defaultOptions,
    filterValidWorkflowOptions(WorkflowOptions),
    filterValidCliOptions(runWorkflowOptions),
  ]);

  return finalOptions;
}

export function getFinalSourceOptions(
  WorkflowOptions: WorkflowOptions,
  runWorkflowOptions: RunWorkflowOptions,
  sourceOptions: SourceOptions,
): SourceOptions {
  const defaultOptions: SourceOptions = {
    force: false,
    debug: false,
    if: true,
  };

  const validRunWorkflowOptions = filterValidSourceOptions(
    runWorkflowOptions,
  );
  const finalOptions: SourceOptions = mergeAll([
    defaultOptions,
    WorkflowOptions,
    sourceOptions,
    validRunWorkflowOptions,
  ]) as SourceOptions;

  return finalOptions;
}
export function getFinalRunOptions(
  runWorkflowOptions: RunWorkflowOptions,
  isDebug: boolean,
): InternalRunWorkflowOptions {
  const defaultOptions: InternalRunWorkflowOptions = {
    files: ["workflows"],
    debug: isDebug,
    stdin: false,
  };
  const finalOptions: InternalRunWorkflowOptions = mergeAll([
    defaultOptions,
    runWorkflowOptions,
  ]) as InternalRunWorkflowOptions;

  return finalOptions;
}
const overwriteMerge = (_: unknown, sourceArray: unknown, __: unknown) =>
  sourceArray;

export function mergeAll(arr: unknown[]) {
  return deepmerge.all(arr, { arrayMerge: overwriteMerge });
}
