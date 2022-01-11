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
runScript(`
console.log("hello deno");
const {delay}=await import("https://deno.land/std/async/delay.ts");
await delay(1000);
console.log("currentState",$state);
$state = ["1"];
return [{
  "id": "1",
  "test":1
}];
`).then((data) => {
  console.log("result", data);
}).catch((e) => {
  console.log("e", e);
});
