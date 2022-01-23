import { assertEquals } from "../../deps.ts";
import { template } from "./template.ts";
// Simple name and function, compact form, but not configurable
Deno.test("template #1", async () => {
  const result = await template("Test ${{name}}", {
    name: "Deno",
  });

  assertEquals(result, "Test Deno");
});

Deno.test("template #2", async () => {
  const result = await template(
    "Test ${item.test.name} ${{item.test.name}} ${{}} ${{ }} ${} ${{ item.test.name }}",
    {
      name: "Deno",
      item: {
        test: {
          name: "Deno",
        },
      },
    },
  );

  assertEquals(result, "Test ${item.test.name} Deno ${{}} ${{ }} ${} Deno");
});

Deno.test("template #3", async () => {
  const result = await template("Test ${{name}} ${{ name.toUpperCase() }}", {
    name: "Deno",
  });

  assertEquals(result, "Test Deno DENO");
});
Deno.test("template4", async () => {
  const result = await template("${{ JSON.stringify({content:name}) }}", {
    name: "Deno",
  });

  assertEquals(result, JSON.stringify({ content: "Deno" }));
});
