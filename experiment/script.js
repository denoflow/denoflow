function runScript(content) {
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
runScript(`
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
}).catch((e) => {
  console.log("e", e);
});
