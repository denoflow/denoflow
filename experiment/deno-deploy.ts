import { serve } from "https://deno.land/std@0.114.0/http/server.ts";
export async function runScript(
  expression: string,
  locals: Record<string, unknown>,
) {
  let declare = "";
  for (const key in locals) {
    if (Object.prototype.hasOwnProperty.call(locals, key)) {
      if (key === "state") {
        declare += "let " + key + "=locals['" + key + "'];";
      } else {
        declare += "const " + key + "=locals['" + key + "'];";
      }
    }
  }
  const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
  return await (AsyncFunction(
    "locals",
    `${declare}
    let scriptResult =  await (async function main() {
      ${expression}
    })();
    return {
      result:scriptResult,
      state:state
    };
    `,
  ))(locals);
}

console.log("Listening on http://localhost:8000");
serve((_req) => {
  return runScript(
    `
console.log("hello "+name);
const {delay}=await import("https://deno.land/std/async/delay.ts");
await delay(1000);
let currentState = $getState();
console.log("currentState",currentState);
$setState(["1"]);
return {
  "test":1
}
`,
    {
      name: "test",
    },
  ).then((data) => {
    console.log("result", data);
    return new Response("Hello World! success", {
      headers: { "content-type": "text/plain" },
    });
  }).catch((e) => {
    console.log("e", e);
    return new Response("Hello World! failed", {
      headers: { "content-type": "text/plain" },
    });
  });
});
