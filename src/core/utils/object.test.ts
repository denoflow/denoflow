import { isClass } from "./object.ts";
import { assert } from "../../../deps.ts";

Deno.test("is class", () => {
  // const isFuncClass = isClass(function () {});
  // assert(!isFuncClass);
  class A {}
  const isClassClass = isClass(A);
  assert(isClassClass);
});
