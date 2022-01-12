import { assertEquals } from "https://deno.land/std@0.120.0/testing/asserts.ts";
import { template } from "./template.ts";
// Simple name and function, compact form, but not configurable
Deno.test("template #1", () => {
  const result = template("Test ${{name}}", {
    name: "Deno",
  });

  assertEquals(result, "Test Deno");
});

Deno.test("template #2", () => {
  const result = template(
    "Test ${item.test.name} ${{item.test.name}} ${{}} ${} ${{ item.test.name }}",
    {
      name: "Deno",
      item: {
        test: {
          name: "Deno",
        },
      },
    },
  );

  assertEquals(result, "Test ${item.test.name} Deno ${{}} ${} Deno");
});

Deno.test("template #3", () => {
  const result = template("Test ${{name}} ${{ name.toUpperCase() }}", {
    name: "Deno",
  });

  assertEquals(result, "Test Deno DENO");
});
