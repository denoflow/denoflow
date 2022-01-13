import { Keydb } from "../../deps.ts";

export interface RunWorkflowOptions {
  force?: boolean;
  filter: string;
}
export interface InternalState {
  uniqueKeys: string[];
  lastRunStartedAt?: string;
  lastRunEndedAt?: string;
}
export interface PublicContext {
  env: Record<string, string | undefined>;
  cwd: string;
  workflowPath: string;
  workflowCwd: string;
  result?: unknown; // last step result
  error?: unknown; // last step error
  items?: unknown[]; // trigger items
  item?: unknown; // trigger item
  index?: number; // trigger item index
  steps: Record<string | number, unknown>;
  [key: string]: unknown;
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
}
export interface Trigger extends Step {
  itemsPath?: string;
  uniqueKey?: string;
}

export interface Workflow {
  on?: Trigger;
  steps: Step[];
}

export interface InternalTriggerResult {
  result: unknown;
  ctx: Context;
}
