// WorkflowOptions File Structure
export interface WorkflowOptions {
  general?: GeneralOptions;
  env?: Record<string, string | undefined>;
  // default: always
  on?: Record<EventType, EventOptions>;
  sources?: SourceOptions[];
  filter?: FilterOptions;
  steps?: StepOptions[];
}
// general: General Options
export interface GeneralOptions {
  sleep?: string | number;
  debug?: boolean;
}

// on:  Event Options
type EventOptions = ScheduleOptions | HttpOptions;
enum EventType {
  Schedule = "schedule",
  Http = "http",
  Always = "always", // default
}

// sources: Source Options
export interface SourceOptions extends FilterOptions {
  itemsPath?: string;
  limit?: number;
  key?: string;
  force?: boolean;
  format?: string;
}

// filter: FilterOptions Options
export interface FilterOptions extends StepOptions {
  limit?: number;
}

// step: StepOptionss Options
export interface StepOptions extends GeneralOptions {
  id?: string;
  from?: string;
  use?: string;
  args?: unknown[];
  run?: string;
  if?: string | boolean;
  env?: Record<string, string | undefined>;
  // run shell command
  cmd?: string;
  continueOnError?: boolean;
}

export interface StepResponse {
  result: unknown;
  ok: boolean;
  isRealOk: boolean;
  error?: unknown;
}
// ctx: all ctx you may need
export interface PublicContext {
  env: Record<string, string | undefined>; // env vars
  cwd: string; // current working directory
  workflowPath: string; // workflowfile absolute path
  workflowRelativePath: string; // workflow file path relative to cwd
  workflowCwd: string; // workflow cwd, absolute path
  options?: GeneralOptions; // workflow general options, formated by getDefaultWorkflowOptionsOptions
  result?: unknown; // last step result
  error?: unknown; // last step error
  cmd?: unknown; // last cmd result // TODO specific type
  ok?: boolean; // last step state, true if no error
  isRealOk?: boolean; // last step real state, true if no error, when continueOnError is true, and step is error,  it will be false, but ok will be true
  items: unknown[]; // sources/filter result items
  item?: unknown; // current item that being step handled
  itemIndex?: number; //  current item index that being step handled
  itemKey?: string; // current item unique key that being step handled
  sourceIndex?: number; // current source index , used in sources
  filter?: StepResponse; // filter result
  sources: Record<string | number, StepResponse>; // sources result
  steps: Record<string | number, StepResponse>; // steps results
  stepIndex?: number; // current step index
  state: unknown; // workflow state , write/read, change this value, can be persisted
}

// run workflow options
export interface RunWorkflowOptions extends GeneralOptions {
  force?: boolean;
  limit?: number;
  files?: string[];
}

// schedule options
export interface ScheduleOptions {
  every?: string;
}
// http options
export interface HttpOptions {
  resStatusCode?: number;
  resContentType?: string;
  resBody?: string;
}
