export async function runScript(
  expression: string,
  locals: Record<string, unknown>,
) {
  let declare = "";
  if (!locals.ctx) {
    locals.ctx = {};
  }
  for (const key in locals) {
    if (Object.prototype.hasOwnProperty.call(locals, key)) {
      declare += "const " + key + "=locals['" + key + "'];";
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
      ctx: ctx,
    };
    `,
  ))(locals);
}
