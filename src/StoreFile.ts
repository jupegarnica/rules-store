import { dirname, existsSync, fromFileUrl, resolve } from "./deps.ts";
import { Store } from "./Store.ts";
import { StoreNotFoundError } from "./Errors.ts";
import type { Config, Finder, Value, ValueOrFunction } from "./types.ts";
import { debounce } from "./helpers.ts";
/**
 * A database in RAM  with persistance plain text as JSON.
 *
 */
export abstract class StoreFile extends Store {
  /**
   * Config state
   */
  #storePath: string;
  #autoSave = false;
  #writeLazyDelay: number;
  /**
   * Writes cached data to disk asynchronously debounced with a delay defined at config.writeLazyDelay
   */
  public writeLazy: () => Promise<void>;

  /**
   * Create a new Store instance.
   *
   * @param {Config} config - The configuration
   * @param {string} config.filename - it defaults to .store.db
   * @param {string} config.folder - it defaults to mainModulePath
   * @param {boolean} config.autoSave - whether or not should be lazily write to disk after every update.
   * @param {number} config.writeLazyDelay - The debounce delay for .writeLazy.  It defaults to 0
   * */

  constructor(config?: Config) {
    super(config);
    this.#autoSave = config?.autoSave ?? false;
    this.#writeLazyDelay = config?.writeLazyDelay ?? 0;
    const filename = config?.filename || ".store.db";
    const folder = config?.folder || fromFileUrl(dirname(Deno.mainModule));
    this.#storePath = resolve(folder, filename);
    this.load();
    this.writeLazy = async () => {};
    this.writeLazy = debounce(
      () => this.write(),
      this.#writeLazyDelay,
    );
  }
  /**
   * Return internal storePath.
   */
  public get storePath(): string {
    return this.#storePath;
  }

  protected _set(
    keys: Keys,
    valueOrFunction: ValueOrFunction,
  ): Value {
    const returned = super._set(keys, valueOrFunction);
    if (this.#autoSave) {
      this.writeLazy().catch((error) => {
        throw error;
      });
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
