import { Keydb } from "../deps.ts";
import { PublicContext, SourceOptions } from "./interface.ts";
export interface InternalSourceResult {
  result: unknown;
  ctx: Context;
}
export interface InternalState {
  keys: string[];
  lastRunStartedAt?: string;
  lastRunEndedAt?: string;
}
export interface InternalRunWorkflowOptions {
  force?: boolean;
  files: string[];
  debug: boolean;
  content?: string;
  [key: string]: unknown;
}
export enum StepType {
  Source = "source",
  Filter = "filter",
  Step = "step",
}
export interface Context {
  public: PublicContext;
  internalState?: InternalState;
  db?: Keydb;
  initState?: string;
  initInternalState?: string;
  currentStepType: StepType;
  sourcesOptions: SourceOptions[];
  itemSourceOptions?: SourceOptions;
}
