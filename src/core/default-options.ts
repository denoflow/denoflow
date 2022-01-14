import {
  InternalRunWorkflowOptions,
  RunWorkflowOptions,
  Trigger,
  WorkflowOptions,
} from "./interface.ts";
import { defaultsDeep } from "../../deps.ts";
function getValidWorkflowOption(
  options: RunWorkflowOptions | Trigger,
): WorkflowOptions {
  let { force, maxItems, debug } = options || {};
  if ("verbose" in options) {
    if (options.verbose !== undefined) {
      debug = options.verbose;
    }
  }
  const validTriggerOptions: WorkflowOptions = {
    force,
    maxItems,
    debug,
  };
  return validTriggerOptions;
}

export function getDefaultWorkflowOptions(
  runWorkflowOptions: RunWorkflowOptions,
  triggerOptions: Trigger,
): WorkflowOptions {
  const defaultOptions: WorkflowOptions = {
    force: false,
    debug: false,
  };

  const validRunWorkflowOptions = getValidWorkflowOption(
    getDefaultRunOptions(runWorkflowOptions),
  );
  const validTriggerOptions = getValidWorkflowOption(triggerOptions);

  const finalOptions: WorkflowOptions = defaultsDeep(
    validTriggerOptions,
    validRunWorkflowOptions,
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
