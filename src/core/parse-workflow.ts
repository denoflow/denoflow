import { parse } from "../../deps.ts";
import { Workflow } from "./interface.ts";
export function parseWorkflow(content: string): Workflow {
  const data = parse(content);
  return data as Workflow;
}
