import { Context } from "./internal-interface.ts";
enum Type {
  NO_DEPENDENCY,
  PREVIOUS_COMMAND_MUST_SUCCEED,
  PREVIOUS_COMMAND_MUST_FAIL,
}
class CmdError extends Error {
  public code: number;
  constructor(code: number, public message: string) {
    super(message);
    this.code = code;
  }
}
function getCommandParams(command: string): string[] {
  const myRegexp = /[^\s"]+|"([^"]*)"/gi;
  const splits = [];
  let match;
  do {
    //Each call to exec returns the next regex match as an array
    match = myRegexp.exec(command);
    if (match != null) {
      //Index 1 in the array is the captured group if it exists
      //Index 0 is the matched text, which we use if no captured group exists
      splits.push(match[1] ? match[1] : match[0]);
    }
  } while (match != null);

  return splits;
}
export function setCmdOkResult(ctx: Context, cmdResult: string): Context {
  ctx.public.cmdResult = cmdResult;
  ctx.public.cmdOk = true;
  ctx.public.cmdError = undefined;
  ctx.public.cmdCode = 0;

  return ctx;
}
export function setCmdErrorResult(
  ctx: Context,
  error: string,
  code: number,
): Context {
  ctx.public.cmdResult = undefined;
  ctx.public.cmdOk = false;
  ctx.public.cmdError = error;
  ctx.public.cmdCode = code;
  return ctx;
}
function splitCommand(
  command: string,
): { command: string; type: Type; muted: boolean }[] {
  const commands: { command: string; type: Type; muted: boolean }[] = [];
  let currentAppendingCommandIndex = 0;
  let stringStartIndexOfCurrentCommand = 0;
  let currentCommandType: Type = Type.NO_DEPENDENCY;

  for (let i = 0; i < command.length; i++) {
    if (i === command.length - 1) {
      commands[currentAppendingCommandIndex] = {
        command: command.slice(stringStartIndexOfCurrentCommand).trim(),
        type: currentCommandType,
        muted: false,
      };
    }

    if (command[i] === "&") {
      if (command[i + 1] && command[i + 1] === "&") {
        commands[currentAppendingCommandIndex] = {
          command: command.slice(stringStartIndexOfCurrentCommand, i - 1)
            .trim(),
          type: currentCommandType,
          muted: false,
        };
        currentCommandType = Type.PREVIOUS_COMMAND_MUST_SUCCEED;
      } else {
        commands[currentAppendingCommandIndex] = {
          command: command.slice(stringStartIndexOfCurrentCommand, i - 1)
            .trim(),
          type: currentCommandType,
          muted: true,
        };
      }
      i += 2;
      stringStartIndexOfCurrentCommand = i;
      currentAppendingCommandIndex++;
    }

    if (command[i] === "|") {
      if (command[i + 1] && command[i + 1] === "|") {
        commands[currentAppendingCommandIndex] = {
          command: command.slice(stringStartIndexOfCurrentCommand, i - 1)
            .trim(),
          type: currentCommandType,
          muted: false,
        };
        currentCommandType = Type.PREVIOUS_COMMAND_MUST_FAIL;
        i += 2;
        stringStartIndexOfCurrentCommand = i;
        currentAppendingCommandIndex++;
      }
    }
  }
  return commands;
}

export interface IExecResponse {
  code: number;
  stdout: string;
}

interface IOptions {
  verbose?: boolean;
  continueOnError?: boolean;
}

export const runCmd = async (
  _ctx: Context,
  command: string,
  options: IOptions = { verbose: false },
): Promise<IExecResponse> => {
  const commands = splitCommand(command);

  let output = "";
  let lastRunFailed = false;

  for (const individualCommand of commands) {
    if (
      individualCommand.type === Type.PREVIOUS_COMMAND_MUST_SUCCEED &&
      lastRunFailed
    ) {
      if (options.verbose) {
        console.log(
          `Skipped command ' ${individualCommand.command}' because last process did fail`,
        );
      }
      lastRunFailed = true;
      continue;
    }

    if (
      individualCommand.type === Type.PREVIOUS_COMMAND_MUST_FAIL &&
      !lastRunFailed
    ) {
      if (options.verbose) {
        console.log(
          `Skipped command '${individualCommand.command}' because last process didn't fail`,
        );
      }
      lastRunFailed = true;
      continue;
    }

    if (options.verbose) {
      console.log(`Executing command '${individualCommand.command}'`);
    }
    const commandParameters: string[] = getCommandParams(
      individualCommand.command,
    );
    const process: Deno.Process = Deno.run({
      cmd: commandParameters,
      stdout: "piped",
      stderr: "piped",
    });
    let response = "";
    let stderr = "";
    const decoder = new TextDecoder();

    const buff = new Uint8Array(1);

    while (true) {
      try {
        const result = await process.stdout?.read(buff);
        if (!result) {
          break;
        }
        response = response + decoder.decode(buff);
        await Deno.stdout.write(buff);
      } catch (_) {
        break;
      }
    }
    const errorBuff = new Uint8Array(1);

    while (true) {
      try {
        const result = await process.stderr?.read(errorBuff);
        if (!result) {
          break;
        }
        stderr = stderr + decoder.decode(errorBuff);
        await Deno.stdout.write(errorBuff);
      } catch (_) {
        break;
      }
    }
    const status = await process.status();
    process.stdout?.close();
    process.stderr?.close();
    process.close();

    if (!individualCommand.muted && !status.success) {
      if (options.verbose) {
        console.log(
          `Process of command '${individualCommand.command}' threw an error`,
        );
      }
      if (!options.continueOnError) {
        const error = new CmdError(status.code, stderr);
        throw error;
      } else {
        lastRunFailed = true;
      }
    } else {
      lastRunFailed = false;
    }

    output += response;
  }

  const finalStdout = output.replace(/\n$/, "");

  return {
    code: 0,
    stdout: finalStdout,
  };
};
