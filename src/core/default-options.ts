import {
  RunWorkflowOptions,
  SourceOptions,
  WorkflowOptions,
} from "./interface.ts";
import { InternalRunWorkflowOptions } from "./internal-interface.ts";

import { defaultsDeep } from "../../deps.ts";
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
export function getDefaultWorkflowOptions(
  WorkflowOptions: WorkflowOptions,
  runWorkflowOptions: RunWorkflowOptions,
): WorkflowOptions {
  const defaultOptions: WorkflowOptions = {
    debug: false,
    database: "json://data",
  };
  const finalOptions: WorkflowOptions = defaultsDeep(
    runWorkflowOptions,
    WorkflowOptions,
    defaultOptions,
  );

  return finalOptions;
}

export function getDefaultSourceOptions(
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
export function getDefaultRunOptions(
  runWorkflowOptions: RunWorkflowOptions,
  isDebug: boolean,
): InternalRunWorkflowOptions {
  const defaultOptions: InternalRunWorkflowOptions = {
    force: false,
    files: ["workflows"],
    debug: isDebug,
  };
  const finalOptions: InternalRunWorkflowOptions = defaultsDeep(
    runWorkflowOptions,
    defaultOptions,
  );

  return finalOptions;
}
