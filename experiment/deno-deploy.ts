import { serve } from "https://deno.land/std@0.114.0/http/server.ts";
function runScript(content: string) {
  return new Promise((resolve, reject) => {
    const $ctx = {};
    const $state = ["2"];
    try {
      const src = new Blob([`
    const $ctx = ${JSON.stringify($ctx)};
    let $state = ${JSON.stringify($state)};
    try {
      const result = await (async ()=>{
        ${content}
      })();
      postMessage({
        type:"success",
        result:result,
        $state:$state
      });
    }catch(e){
      postMessage({
        type:"failure",
        error:e
      });
    }
    
    `]);
      const worker = new Worker(URL.createObjectURL(src), { type: "module" });

      worker.onmessage = function (event) {
        console.log("Received message ", event.type, event.data);
        if (event.data.type === "success") {
          resolve(event.data);
          worker.terminate();
        } else if (event.data.type === "failure") {
          reject(event.data.error);
          worker.terminate();
        }
      };
    } catch (error) {
      reject(error);
    }
  });
}

console.log("Listening on http://localhost:8000");
serve((_req) => {
  return runScript(`
console.log("hello deno");
const {delay}=await import("https://deno.land/std/async/delay.ts");
await delay(1000);
let currentState = $getState();
console.log("currentState",currentState);
$setState(["1"]);
return {
  "test":1
}
`).then((data) => {
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
