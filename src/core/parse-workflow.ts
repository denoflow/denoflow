import { parse } from "../../deps.ts";
import { Workflow } from "./interface.ts";
export function parseWorkflow(content: string): Workflow {
  const data = parse(content);
  console.log(data);
  return data as Workflow;
}
