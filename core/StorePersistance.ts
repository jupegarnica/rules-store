import { Store } from "./Store.ts";
import type { Config, Mutation, Value } from "./types.ts";
import { debounce } from "./helpers.ts";
export abstract class StorePersistance extends Store {
  /**
   * Config state
   */
  #autoSave = false;
  #persistLazyDelay: number;
  protected _name: string;
  protected _folder: string;
  protected _storePath = "";
  /**
   * Writes cached data to disk asynchronously debounced with a delay defined at config.persistLazyDelay
   */
  public persistLazy: () => Promise<void>;

  /**
   * Create a new Store instance.
   *
   * @param {Config} config - The configuration
   * @param {string} config.name - it defaults to .store.db
   * @param {string} config.folder - it defaults to mainModulePath
   * @param {boolean} config.autoSave - whether or not should be lazily write to disk after every update.
   * @param {number} config.persistLazyDelay - The debounce delay for .persistLazy.  It defaults to 0
   * */

  constructor(config: Config = {}) {
    super(config);
    this.#autoSave = config.autoSave ?? false;
    this.#persistLazyDelay = config.persistLazyDelay ?? 0;
    this._name = config.name || ".store.db";
    this._folder = config.folder || "";
    this._storePath = [this._folder, this._name].filter(Boolean).join("/");
    this.load();
    this.persistLazy = debounce(
      () => this.persist(),
      this.#persistLazyDelay,
    );
  }
  /**
   * Return internal storePath.
   */
  public get storePath(): string {
    return this._storePath;
  }

  protected _commit(
    toCommit: Mutation[],
  ): Value {
    const returned = super._commit(toCommit);
    if (this.#autoSave) {
      this.persistLazy().catch((error) => {
        // TODO what to do if write with persistLazy fails?
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
  abstract persist(): void;

  /**
   * Deletes the persisted data .
   *
   */
  abstract deletePersisted(): void;
}
