import { Store } from "./Store.ts";
import type { Config, Mutation, Value } from "./types.ts";
import { debounce } from "./helpers.ts";
export abstract class StorePersistance extends Store {
  /**
   * Config state
   */
  #autoSave = false;
  #writeLazyDelay: number;
  protected _name: string;
  protected _folder: string;
  /**
   * Writes cached data to disk asynchronously debounced with a delay defined at config.writeLazyDelay
   */
  public writeLazy: () => Promise<void>;

  /**
   * Create a new Store instance.
   *
   * @param {Config} config - The configuration
   * @param {string} config.name - it defaults to .store.db
   * @param {string} config.folder - it defaults to mainModulePath
   * @param {boolean} config.autoSave - whether or not should be lazily write to disk after every update.
   * @param {number} config.writeLazyDelay - The debounce delay for .writeLazy.  It defaults to 0
   * */

  constructor(config: Config = {}) {
    super(config);
    this.#autoSave = config.autoSave ?? false;
    this.#writeLazyDelay = config.writeLazyDelay ?? 0;
    this._name = config.name || ".store.db";
    this._folder = config.folder || "";

    this.load();
    this.writeLazy = debounce(
      () => this.write(),
      this.#writeLazyDelay,
    );
  }
  /**
   * Return internal storePath.
   */
  public get storePath(): string {
    return [this._folder, this._name].filter(Boolean).join("/");
  }

  protected _commit(
    toCommit: Mutation[],
  ): Value {
    const returned = super._commit(toCommit);
    if (this.#autoSave) {
      this.writeLazy().catch((error) => {
        // TODO what to do if write with writeLazy fails?
        console.error(error);
        // throw error;
      });
    }
    return returned;
  }

  /**
   * Load persisted data into cache
   *
   */
  abstract load(): void;
  /**
   * Persist data
   *
   */
  abstract write(): void;

  /**
   * Deletes the persisted data .
   *
   */
  abstract deleteStore(): void;
}
