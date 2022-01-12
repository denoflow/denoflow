export interface Adapter {
  awaitReady?: Promise<Adapter>;
  run(options: unknown): Promise<void> | void;
}
