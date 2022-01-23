import { parse } from "../deps.ts";
import { WorkflowOptions } from "./interface.ts";
export function parseWorkflow(content: string): WorkflowOptions {
  const data = parse(content);
  return data as WorkflowOptions;
}
