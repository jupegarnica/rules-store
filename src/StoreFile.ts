import { dirname, existsSync, fromFileUrl, resolve } from "./deps.ts";
import { Store } from "./Store.ts";
import { StoreNotFoundError } from "./Errors.ts";
import type { Config, Finder, Value, ValueOrFunction } from "./types.ts";
import { debounce } from "./helpers.ts";
/**
 * A database in RAM  with persistance plain text as JSON.
 */
export abstract class StoreFile extends Store {
  /**
   * Config state
   */
  #storePath: string;
  #autoSave = false;
  #writeLazyDelay;

  /**
   * Create a new {Store} instance.
   * If no custom path is given, it defaults to mainModulePath/.store.yaml
   *
   * @param config type Config
   */
  constructor(config?: Config) {
    super(config);
    this.#autoSave = config?.autoSave ?? false;
    this.#writeLazyDelay = config?.writeLazyDelay ?? 0;
    const filename = config?.filename || ".store.db";
    const folder = config?.folder || fromFileUrl(dirname(Deno.mainModule));
    this.#storePath = resolve(folder, filename);
    this.load();
    this.writeLazy = debounce(
      () => {
        this.write();
      },
      this.#writeLazyDelay,
      this,
    );
  }
  /**
   * Return internal storePath.
   */
  public get storePath(): string {
    return this.#storePath;
  }

  public set(
    path: string,
    valueOrFunction: ValueOrFunction,
  ): Value {
    const returned = super.set(path, valueOrFunction);
    if (this.#autoSave) {
      this.writeLazy();
    }
    return returned;
  }
  public push(path: string, ...values: Value[]): Value {
    const returned = super.push(path, ...values);
    if (this.#autoSave) {
      this.writeLazy();
    }
    return returned;
  }
  public remove(path: string, returnRemoved = true): Value {
    const returned = super.remove(path, returnRemoved);
    if (this.#autoSave) {
      this.writeLazy();
    }
    return returned;
  }

  public findAndRemove(
    path: string,
    finder: Finder,
    returnRemoved = true,
  ): Value {
    const returned = super.findAndRemove(path, finder, returnRemoved);
    if (this.#autoSave) {
      this.writeLazy();
    }
    return returned;
  }

  public findOneAndRemove(
    path: string,
    finder: Finder,
    returnRemoved = true,
  ): Value {
    const returned = super.findOneAndRemove(path, finder, returnRemoved);
    if (this.#autoSave) {
      this.writeLazy();
    }
    return returned;
  }

  /**
   * Load stored data from disk into cache.
   */
  abstract load(): void;
  /**
   * Writes cached data to disk synchronously
   */
  abstract write(): void;

  /**
   * Writes cached data to disk asynchronously debounced with a delay defined at      config.writeLazyDelay
   */
  public writeLazy: () => Promise<void>;

  /**
   * Deletes a store file .
   *
   */
  public deleteStore(): void {
    const storePath = this.#storePath;
    if (!existsSync(storePath)) {
      throw new StoreNotFoundError(`${storePath} not exists`);
    }
    Deno.removeSync(storePath);
    return;
  }
}
