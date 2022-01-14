import { runScript } from "./run-script.ts";
export function template(
  str: string,
  locals: Record<string, unknown>,
): Promise<unknown> {
  const compiled = compile(str);
  return compiled(locals);
}

function compile(
  str: string,
): (locals: Record<string, unknown>) => Promise<unknown> {
  // First pattern , note.
  // const es6TemplateRegex = /(\\)?\$\{\{([^(\{\})]+)\}\}/g;
  const es6TemplateRegex = /(\\)?\$\{\{(.*?)\}\}/g;

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
        const result = await replaceAsync(
          str,
          es6TemplateRegex,
          function (matched) {
            return parse(matched)(locals || {});
          },
          {
            single: true,
          },
        );

        return result;
      }
    }

    const result = await replaceAsync(
      str,
      es6TemplateRegex,
      function (matched) {
        return parse(matched)(locals || {});
      },
      {
        single: false,
      },
    );
    // console.log("result", result);

    return result;
  };
}
async function replaceAsync(
  str: string,
  regex: RegExp,
  asyncFn: (match: string) => Promise<string>,
  options: Record<string, unknown>,
) {
  let isSingle = false;
  if (options && options.single) {
    isSingle = true;
  }
  const promises: Promise<string>[] = [];
  const tempStr = str;
  tempStr.replace(regex, (match, ..._args): string => {
    const promise = asyncFn(match);
    promises.push(promise);
    return "";
  });
  const data = await Promise.all(promises);
  let result;

  const regularReplacedResult = str.replace(regex, () => {
    const replaced = data.shift() as string;
    if (isSingle) {
      result = replaced;
      return replaced;
    } else {
      return replaced;
    }
  });
  if (isSingle) {
    return result;
  } else {
    return regularReplacedResult;
  }
}
function parse(
  variable: string,
): (locals: Record<string, unknown>) => Promise<string> {
  const matched = variable.match(/\{\{(.+)\}\}/);
  if (Array.isArray(matched) && matched.length > 0) {
    const exp = matched[1];

    if (variable[0] === "\\") {
      return async function (_locals: Record<string, unknown>) {
        return await variable.slice(1);
      };
    }
    // handle ${{}} and ${{ }} , not translate these pattern
    if (exp.trim() === "") {
      return async function (_locals: Record<string, unknown>) {
        return await variable;
      };
    }

    return async function (locals: Record<string, unknown>) {
      const scriptResult = await runScript(`return ${exp};`, locals);

      return scriptResult.result;
    };
  } else {
    return async function (_locals: Record<string, unknown>) {
      return await variable;
    };
  }
}
