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
