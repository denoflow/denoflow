import {
  RunWorkflowOptions,
  SourceOptions,
  WorkflowOptions,
} from "./interface.ts";
import { InternalRunWorkflowOptions } from "./internal-interface.ts";

import { defaultsDeep } from "../../deps.ts";
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

  const validSourceOptions: SourceOptions = {
    force,
    limit,
    debug,
  };
  return validSourceOptions;
}
function filterValidCliOptions(
  options: RunWorkflowOptions,
): RunWorkflowOptions {
  const validWorkflowOptions: RunWorkflowOptions = {};
  ValidCliWorkflowFlags.forEach((key) => {
    if (options[key] !== undefined) {
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
    if (options[key] !== undefined) {
      validWorkflowOptions[key] = options[key];
    }
  });

  return validWorkflowOptions;
}
export function getFinalWorkflowOptions(
  WorkflowOptions: WorkflowOptions,
  runWorkflowOptions: RunWorkflowOptions,
): WorkflowOptions {
  const defaultOptions: WorkflowOptions = {
    debug: false,
    database: "json://data",
  };
  const finalOptions: WorkflowOptions = defaultsDeep(
    filterValidCliOptions(runWorkflowOptions),
    filterValidWorkflowOptions(WorkflowOptions),
    defaultOptions,
  );

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
  };

  const validRunWorkflowOptions = filterValidSourceOptions(
    runWorkflowOptions,
  );
  const finalOptions: SourceOptions = defaultsDeep(
    validRunWorkflowOptions,
    sourceOptions,
    WorkflowOptions,
    defaultOptions,
  );

  return finalOptions;
}
export function getFinalRunOptions(
  runWorkflowOptions: RunWorkflowOptions,
  isDebug: boolean,
): InternalRunWorkflowOptions {
  const defaultOptions: InternalRunWorkflowOptions = {
    files: ["workflows"],
    debug: isDebug,
  };
  const finalOptions: InternalRunWorkflowOptions = defaultsDeep(
    runWorkflowOptions,
    defaultOptions,
  );

  return finalOptions;
}
