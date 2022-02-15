import { Store } from "./json-store.ts";

import { Adapter, Adapters, Keydb, KeydbFields } from "../../deps.ts";

export class JsonStoreAdapter implements Adapter {
  namespaces: Map<
    string,
    Store
  > = new Map();
  path = "data";
  constructor(path?: string) {
    this.path = path ?? this.path;
  }
  static getDataPathFromUri(uri: string): string | undefined {
    if (!uri) {
      return undefined;
    }
    let path: string | undefined = uri.toString().slice(5);
    if (path.startsWith("//")) path = path.slice(2);
    return path;
  }
  checkNamespace(ns: string) {
    if (this.namespaces.has(ns)) {
      return;
    } else {
      this.namespaces.set(
        ns,
        new Store({
          name: `${ns}.json`,
          path: `${this.path}`,
        }),
      );
    }
  }

  ns(ns: string): Store {
    if (ns === "") {
      ns = "default-data";
    }
    this.checkNamespace(ns);
    return this.namespaces.get(ns) as Store;
  }

  // deno-lint-ignore no-explicit-any
  async set(k: string, v: any, ns = "", ttl = 0) {
    const n = this.ns(ns);
    await n.set(k, { value: v, ttl });
    return this;
  }

  async get(k: string, ns = ""): Promise<KeydbFields | undefined> {
    const n = this.ns(ns);
    const v = await n?.get(k);
    return !v ? undefined : {
      key: k,
      ns,
      value: (v as KeydbFields).value,
      ttl: (v as KeydbFields).ttl,
    };
  }

  async has(k: string, ns = ""): Promise<boolean> {
    const n = this.ns(ns);

    return await n.has(k) ?? false;
  }

  async delete(k: string, ns = "") {
    const n = this.ns(ns);
    return await n?.delete(k) ?? false;
  }

  async keys(ns = ""): Promise<string[]> {
    const n = this.ns(ns);
    const obj = await n.toObject();
    return [...(Object.keys(obj) ?? [])];
  }

  async clear(ns = "") {
    const n = this.ns(ns);
    await n.clear();
    return this;
  }

  async deleteExpired(ns = "") {
    const obj = await this.ns(ns).toObject();
    const n = this.ns(ns);
    for (const k of Object.keys(obj)) {
      const v = obj[k] as KeydbFields;
      if ((v.ttl) !== 0 && Date.now() > v.ttl) {
        delete obj[k];
      }
    }
    await n.set(obj);
  }
}
Adapters.register({
  protocol: "json",
  init(uri) {
    const path = JsonStoreAdapter.getDataPathFromUri(
      uri.toString(),
    );

    const store = new JsonStoreAdapter(path);
    return store;
  },
});
export { Keydb };
