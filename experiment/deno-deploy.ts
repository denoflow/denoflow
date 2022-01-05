import { serve } from "https://deno.land/std@0.114.0/http/server.ts";
function runScript(content: string) {
  return new Promise((resolve, reject) => {
    try {
      const src = new Blob([`
    try {
      const result = await (async ($setState,$getState)=>{
        ${content}
      })((value) => {
        self.postMessage({type:"setState", value});
      },()=>{
        return ["1"];
      });
      console.log("result",result);
      postMessage({
        type:"success",
        value:result
      });
    }catch(e){
      postMessage({
        type:"failure",
        value:e
      });
    }
    
    `]);
      const worker = new Worker(URL.createObjectURL(src), { type: "module" });

      worker.onmessage = function (event) {
        console.log("Received message ", event.type, event.data);

        if (event.data.type === "setState") {
          // TODO
        } else if (event.data.type === "success") {
          resolve(event.data.value);
          worker.terminate();
        } else if (event.data.type === "failure") {
          reject(event.data.value);
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
