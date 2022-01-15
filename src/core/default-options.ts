import {
  GeneralOptions,
  RunWorkflowOptions,
  SourceOptions,
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

export function getDefaultSourceOptions(
  generalOptions: GeneralOptions,
  runWorkflowOptions: RunWorkflowOptions,
  sourceOptions: SourceOptions,
): SourceOptions {
  const defaultOptions: SourceOptions = {
    force: false,
    debug: false,
  };

  const validRunWorkflowOptions = filterValidSourceOptions(
    getDefaultRunOptions(runWorkflowOptions),
  );
  const finalOptions: SourceOptions = defaultsDeep(
    validRunWorkflowOptions,
    sourceOptions,
    generalOptions,
    defaultOptions,
  );

  return finalOptions;
}
export function getDefaultRunOptions(
  runWorkflowOptions: RunWorkflowOptions,
): InternalRunWorkflowOptions {
  const defaultOptions: InternalRunWorkflowOptions = {
    force: false,
    files: ["workflows"],
    debug: false,
  };
  const finalOptions: InternalRunWorkflowOptions = defaultsDeep(
    runWorkflowOptions,
    defaultOptions,
  );

  return finalOptions;
}
