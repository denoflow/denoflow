import { Keydb } from "../../deps.ts";

export interface RunWorkflowOptions {
  force?: boolean;
  maxItems?: number;
  files?: string[];
  debug?: boolean;
  verbose?: boolean;
}
export interface InternalRunWorkflowOptions {
  force: boolean;
  files: string[];
  debug: boolean;
}
export interface InternalState {
  uniqueKeys: string[];
  lastRunStartedAt?: string;
  lastRunEndedAt?: string;
}
export interface WorkflowOptions {
  force?: boolean;
  maxItems?: number;
  debug?: boolean;
}
export interface PublicContext {
  env: Record<string, string | undefined>; // env vars
  cwd: string; // current working directory
  workflowPath: string; // workflowfile absolute path
  workflowRelativePath: string; // workflow file path relative to cwd
  workflowCwd: string; // workflow cwd, absolute path
  options?: WorkflowOptions; // workflow options, formated by getDefaultWorkflowOptions
  result?: unknown; // last step result
  error?: unknown; // last step error
  ok?: boolean; // last step state, true if no error
  items: unknown[]; // trigger items
  item?: unknown; // trigger item
  itemIndex?: number; // trigger item index
  steps: Record<string | number, unknown>; // steps results
  stepIndex?: number; // current step index
  stepOkResults: Record<string | number, boolean>; // step ok status map
  stepErrors: Record<string | number, unknown>; // step errors
  state: unknown; // workflow custom state
}
export interface Context {
  public: PublicContext;
  internalState: InternalState;
  db: Keydb;
  initState: string;
  initInternalState: string;
}
export interface Step {
  id?: string;
  from?: string;
  use?: string;
  args?: unknown[];
  then?: string;
  with?: Record<string, unknown>;
  if?: string | boolean;
  env?: Record<string, string | undefined>;
  debug?: boolean;
  continueOnError?: boolean;
}
export interface Trigger extends Step {
  itemsPath?: string;
  maxItems?: number;
  uniqueKey?: string;
  force?: boolean;
}

export interface Workflow {
  on?: Trigger;
  steps: Step[];
}

export interface InternalTriggerResult {
  result: unknown;
  ctx: Context;
}
