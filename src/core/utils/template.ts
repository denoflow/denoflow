import { runScript } from "./run-script.ts";
export async function template(
  str: string,
  locals: Record<string, unknown>,
): Promise<unknown> {
  return await compile(str).call(null, locals);
}

function compile(str: string): (locals: Record<string, unknown>) => unknown {
  const es6TemplateRegex = /(\\)?\$\{\{([^\{\}\\]+)\}\}/g;
  const es6TemplateStartRegex = /\$\{\{/g;
  const es6TemplateEndRegex = /\}\}/g;

  return async function (locals: Record<string, unknown>) {
    const matched = str.match(es6TemplateRegex);
    const startMatched = str.match(es6TemplateStartRegex);
    const endMatched = str.match(es6TemplateEndRegex);

    if (
      Array.isArray(matched) && matched.length === 1 && startMatched &&
      startMatched.length === 1 && endMatched && endMatched.length === 1
    ) {
      // single variable
      if (str.startsWith("${{") && str.endsWith("}}")) {
        // single parse mode
        let result;
        await replaceAsync(str, es6TemplateRegex, async function (matched) {
          result = await parse(matched)(locals || {});
          return "";
        });
        return result;
      }
    }

    return await replaceAsync(str, es6TemplateRegex, async function (matched) {
      return await parse(matched)(locals || {});
    });
  };
}
async function replaceAsync(
  str: string,
  regex: RegExp,
  asyncFn: (match: string) => Promise<string>,
) {
  const promises: Promise<string>[] = [];
  const tempStr = str;
  tempStr.replace(regex, (match, ..._args): string => {
    const promise = asyncFn(match);
    promises.push(promise);
    return "";
  });
  const data = await Promise.all(promises);
  return str.replace(regex, () => data.shift() as string);
}
function parse(
  variable: string,
): (locals: Record<string, unknown>) => Promise<string> {
  const matched = variable.match(/\{\{(.*)\}\}/);
  if (Array.isArray(matched) && matched.length > 0) {
    const exp = matched[1];

    if (variable[0] === "\\") {
      return async function (_locals: Record<string, unknown>) {
        return await variable.slice(1);
      };
    }

    return async function (locals: Record<string, unknown>) {
      return await runScript(exp, locals);
    };
  } else {
    return async function (_locals: Record<string, unknown>) {
      return await variable;
    };
  }
}
