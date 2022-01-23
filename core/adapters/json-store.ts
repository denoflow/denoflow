import { join } from "../../deps.ts";
import { ensureFile } from "../../deps.ts";

export interface StoreOptions {
  name?: string;
  path?: string;
}

export class Store {
  public name: string;
  public path: string;

  private filePath: string;
  private fileEnsured = false;
  private data?: Record<string, unknown>;
  private isInit = false;

  constructor(opts?: string | StoreOptions) {
    if (typeof opts === "string") {
      opts = {
        name: opts,
      };
    }

    const {
      name = ".json",
      path = ".",
    } = opts || {};

    this.name = name;
    this.path = path.startsWith("/") ? path : join(Deno.cwd(), path);
    this.filePath = join(this.path, name);
  }

  private isNullOrEmptyData() {
    return !this.data || !Object.keys(this.data).length;
  }
  public async init() {
    // check data json is exists
    // if not exists, create it
    // if exists, load it
    if (this.isInit) {
      return;
    }
    // check if data file exists

    const isFileexists = existsSync(this.filePath);
    if (isFileexists) {
      const content = new TextDecoder().decode(
        await Deno.readFile(this.filePath),
      );
      let data = this.data;
      try {
        data = JSON.parse(content);
      } catch (_e) {
        // can't parse json
        data = {};
      }
      this.data = data;
    } else {
      this.data = {};
    }

    this.isInit = true;
  }

  private async load() {
    if (!this.isInit) {
      await this.init();
    }
  }

  private async save() {
    const { data, filePath } = this;

    if (!this.data) {
      return;
    }
    if (!this.fileEnsured) {
      // ensure file
      await ensureFile(filePath);
      this.fileEnsured = true;
    }
    try {
      await Deno.writeFile(
        filePath,
        new TextEncoder().encode(JSON.stringify(data, null, 2)),
        {
          mode: 0o0600,
        },
      );
    } catch (e) {
      throw e;
    }
  }

  async get(key: string) {
    await this.load();

    return this.data![key];
  }

  async set(key: string | { [key: string]: unknown }, val?: unknown) {
    await this.load();

    let dataChanged = false;

    if (typeof key === "string") {
      const oldVal = this.data![key];

      if (oldVal !== val) {
        this.data![key] = val;
        dataChanged = true;
      }
    } else {
      const keys = Object.keys(key);

      for (const k of keys) {
        const oldVal = this.data![k];
        const val = key[k];

        if (oldVal !== val) {
          this.data![k] = val;
          dataChanged = true;
        }
      }
    }

    if (dataChanged) {
      await this.save();
      return true;
    }

    return false;
  }

  async has(key: string) {
    await this.load();
    return Object.prototype.hasOwnProperty.call(this.data!, key);
  }

  async delete(key: string | string[]) {
    if (this.isNullOrEmptyData()) {
      return false;
    }

    await this.load();

    let dataChanged = false;

    if (typeof key === "string") {
      key = [key];
    }

    for (const k of key) {
      if (this.data![k] !== undefined) {
        delete this.data![k];
        dataChanged = true;
      }
    }

    if (dataChanged) {
      await this.save();
      return true;
    }

    return false;
  }

  async clear() {
    if (this.isNullOrEmptyData()) {
      return;
    }

    this.data = {};
    await this.save();
  }

  async toObject() {
    await this.load();
    return this.data!;
  }
}
export const directoryExists = async (dir: string, parent: string) => {
  for await (const entry of Deno.readDir(parent)) {
    if (entry.isDirectory && entry.name === dir) {
      return true;
    }
  }
  return false;
};

export const mkdir = async (path: string) => {
  const parent = Deno.cwd();
  const segments = path.replace(parent, "").split("/");
  let exists = true;

  for (let i = 0; i < segments.length; i++) {
    const s = segments[i];

    if (!s || !i && s === ".") {
      continue;
    } else if (s === "..") {
      return;
    }

    if (!await directoryExists(s, parent + segments.slice(0, i).join("/"))) {
      exists = false;
      break;
    }
  }

  if (!exists) {
    await Deno.mkdir(path, {
      recursive: true,
    });
    return path;
  }
};

export function existsSync(filePath: string): boolean {
  try {
    Deno.lstatSync(filePath);
    return true;
  } catch (err) {
    if (err instanceof Deno.errors.NotFound) {
      return false;
    }
    throw err;
  }
}
