export interface RunWorkflowOptions {
  force?: boolean;
  filter: string;
}
export interface Trigger {
  use: string;
  with?: Record<string, unknown>;
}
export interface Step {
  use?: string;
  with?: Record<string, unknown>;
  run?: string;
}
export interface Workflow {
  on?: Trigger;
  steps: Step[];
}
