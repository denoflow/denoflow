export async function runScript(
  expression: string,
  locals: Record<string, unknown>,
) {
  let declare = "";
  for (const key in locals) {
    if (Object.prototype.hasOwnProperty.call(locals, key)) {
      declare += "const " + key + "=locals['" + key + "'];";
    }
  }
  return await (Function(
    "locals",
    `${declare}
     ${expression};`,
  ))(locals);
}
