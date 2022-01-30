// WorkflowOptions File Structure
export interface WorkflowOptions {
  env?: Record<string, string | undefined>;
  sources?: SourceOptions[];
  filter?: FilterOptions;
  steps?: StepOptions[];
  debug?: boolean; // is debug output enabled
  database?: string; // default json://data , can be sqlite://data.sqlite
  if?: boolean | string; // if true, skip this workflow, can use env variable, e.g. if: ${{env.TEST==='true'}}
  sleep?: number; // sleep time between steps, unit seconds
  force?: boolean; // force run workflow, if true, will ignore state check, unique key, default false
  post?: StepOptions; // post step, will be run aftere all workflow steps done, default null
  [key: string]: unknown;
}
// step: StepOptionss Options
export interface StepOptions {
  id?: string;
  from?: string;
  use?: string; // function name, module name, can be module name import from `from`, or global function
  args?: unknown[];
  run?: string; // run script code, after use function, can use ctx.result from use function
  if?: string | boolean;
  env?: Record<string, string | undefined>;
  cmd?: string; // run shell command
  assert?: string; // assert result, can test, asswert the step result is ok, or not
  post?: string; // post script code, you can do some check, clean, things here, change ctx.state
  continueOnError?: boolean;
  sleep?: number; // sleep time between steps, unit seconds
  debug?: boolean;
}

// filter: FilterOptions Options
export interface FilterOptions extends StepOptions {
  limit?: number;
}
// sources: Source Options
export interface SourceOptions extends FilterOptions {
  itemsPath?: string;
  limit?: number;
  key?: string;
  force?: boolean;
  filter?: string; // script code, should handle `ctx.item` -> return `true` or `false`
  filterFrom?: string; // script file path, ctx as the first args, should handle ctx.item= -> return true or false
  filterItems?: string; // script code, should handle ctx.items= -> return [true,false];
  filterItemsFrom?: string; // script file path, ctx as the first args,  should handle ctx.items= -> return [true,false];
  debug?: boolean;
  reverse?: boolean;
}

export interface StepResponse {
  result: unknown;
  ok: boolean;
  isRealOk: boolean;
  error?: unknown;
  cmdResult?: string;
  cmdCode?: number;
  cmdOk?: boolean;
  cmdError?: string;
}
// ctx: all ctx you may need
export interface PublicContext {
  env: Record<string, string | undefined>; // env vars
  cwd: string; // current working directory
  workflowPath: string; // workflowfile absolute path
  workflowRelativePath: string; // workflow file path relative to cwd
  workflowCwd: string; // workflow cwd, absolute path
  options?: WorkflowOptions; // workflow general options, formated by getDefaultWorkflowOptionsOptions
  result?: unknown; // last step result
  error?: unknown; // last step error
  ok?: boolean; // last step state, true if no error
  isRealOk?: boolean; // last step real state, true if no error, when continueOnError is true, and step is error,  it will be false, but ok will be true
  state?: unknown; // workflow state , write/read, change this value, can be persisted
  items: unknown[]; // sources/filter result items
  item?: unknown; // current item that being step handled
  itemIndex?: number; //  current item index that being step handled
  itemKey?: string; // current item unique key that being step handled
  itemSourceIndex?: number; // current item source index that
  sourceIndex?: number; // current source index , used in sources
  filter?: StepResponse; // filter result
  sources: Record<string | number, StepResponse>; // sources result
  steps: Record<string | number, StepResponse>; // steps results
  stepIndex?: number; // current step index
  cmdResult?: string;
  cmdCode?: number;
  cmdOk?: boolean;
  cmdError?: string;
}

// run workflow options
export interface RunWorkflowOptions {
  force?: boolean;
  limit?: number;
  files?: string[];
  content?: string; // workflow content, if files is empty, you use yml content
  debug?: boolean;
  sleep?: number;
  database?: string;
  [key: string]: unknown;
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
