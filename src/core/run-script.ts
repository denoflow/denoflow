export function runScript(content: string) {
  return new Promise((resolve, reject) => {
    const $ctx = {};
    const $checkpoint = ["2"];
    try {
      const src = new Blob([`
    const $ctx = ${JSON.stringify($ctx)};
    let $checkpoint = ${JSON.stringify($checkpoint)};
    try {
      const result = await (async ()=>{
        ${content}
      })();
      postMessage({
        type:"success",
        result:result,
        $checkpoint:$checkpoint
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
