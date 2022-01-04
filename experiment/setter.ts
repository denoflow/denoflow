const theGlobal = {
  set state(value: unknown) {
    console.log("set", value);
  },
};

async function main() {
  const result = await (async ($) => {
    console.log("hello deno");
    const { delay } = await import("https://deno.land/std/async/delay.ts");
    await delay(1000);
    $.state = [
      "1",
    ];
    return {
      "test": 1,
    };
  })(theGlobal);
}

main();
