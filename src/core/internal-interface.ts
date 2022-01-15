import { Keydb } from "../../deps.ts";
import { GeneralOptions, PublicContext, SourceOptions } from "./interface.ts";
export interface InternalSourceResult {
  result: unknown;
  ctx: Context;
}
export interface InternalState {
  keys: string[];
  lastRunStartedAt?: string;
  lastRunEndedAt?: string;
}
export interface InternalRunWorkflowOptions extends GeneralOptions {
  force: boolean;
  files: string[];
}
export enum StepType {
  Source = "source",
  Filter = "filter",
  Step = "step",
}
export interface Context {
  public: PublicContext;
  internalState: InternalState;
  db: Keydb;
  initState: string;
  initInternalState: string;
  currentStepType: StepType;
  itemKeys: (string | undefined)[];
  itemSourceOptions: SourceOptions[];
}
