import { assertEquals } from "../../../deps.ts";
import { filterGlobFiles } from "./filter.ts";
// Simple name and function, compact form, but not configurable
Deno.test("file filter test #1", () => {
  const validFiles = filterGlobFiles([
    "workflows/local.yml",
    "workflows/local2.yml",
    "local.yaml",
  ], [
    "local",
  ]);

  assertEquals(validFiles, [
    "workflows/local.yml",
    "workflows/local2.yml",
    "local.yaml",
  ]);
});

Deno.test("file filter test #2", () => {
  const validFiles = filterGlobFiles([
    "workflows/local.yml",
    "workflows/xx/loca/local/2.yml",
    "local.yaml",
    "loc2al.yaml",
  ], [
    "local",
  ]);

  assertEquals(validFiles, [
    "workflows/local.yml",
    "workflows/xx/loca/local/2.yml",
    "local.yaml",
  ]);
});

Deno.test("file filter test #3", () => {
  const validFiles = filterGlobFiles([
    "workflows/local.yml",
    "workflows/xx/loca/local/2.yml",
    "local.yaml",
  ], [
    "workflows/*",
  ]);

  assertEquals(validFiles, ["workflows/local.yml"]);
});

Deno.test("file filter test #4", () => {
  const validFiles = filterGlobFiles([
    "workflows/local.yaml",
    "workflows/xx/loca/local/2.yml",
    "local.yaml",
  ], [
    "workflows/local.yaml",
  ]);

  assertEquals(validFiles, ["workflows/local.yaml"]);
});
