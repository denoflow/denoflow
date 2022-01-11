import { Store } from "https://raw.githubusercontent.com/felixblaschke/storeosaurus/2.0.0/mod.ts";

export class JsonStoreAdapter {
  async set(key: string, value?: string): Promise<void> {
    const store = Store.open<string>({
      filePath: `./data/${key}`,
      lazyWrite: true,
    });
    await store.set(value);
  }
  async get(key: string): Promise<string> {
    const store = Store.open<string>({
      filePath: `./data/${key}`,
      lazyWrite: true,
    });
    return await store.get();
  }
}
