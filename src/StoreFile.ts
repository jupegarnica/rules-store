import { existsSync } from './deps.ts';
import { Store } from './Store.ts';

import type { Value, Config, ValueOrFunction } from './types.ts';
/**
 * A database in RAM with persistance plain text as JSON.
 * For non persistance use Store
 */
export abstract class StoreFile extends Store {
  /**
   * The file path in which to store the data in.
   */
  protected _storePath: string;
  protected _autoSave: boolean = false;

  /**
   * Create a new {Store} instance.
   * If no custom path is given, it defaults to mainModulePath/.store.yaml
   *
   * @param storePath A custom path where to write data
   */
  constructor(config?: Config) {
    super();
    this._autoSave = config?.autoSave ?? false;
    this._storePath = config?.filename
      ? config.filename
      : `${new URL('.store.db', Deno.mainModule).pathname}`;
    this.load();
  }
  /**
   * Return internal storePath.
   */
  public get storePath(): string {
    return this._storePath;
  }

  public set(
    path: string,
    valueOrFunction: ValueOrFunction,
  ): Value {
    const returned = super.set(path, valueOrFunction);
    if (this._autoSave) {
      this.write();
    }
    return returned;
  }
  public push(path: string, ...values: Value[]): Value {
    const returned = super.push(path, ...values);
    if (this._autoSave) {
      this.write();
    }
    return returned;
  }
  public remove(path: string): Value {
    const returned = super.remove(path);
    if (this._autoSave) {
      this.write();
    }
    return returned;
  }

  /**
   * Load stored data from disk into cache.
   * Won't update cache values if hash in store file matches current cache file.
   *
   */
    abstract load(): void
  /**
   * Writes cached data to disk.
   * Won't perform write if the last known hash from the store file
   * matches the current cache hash.
   *
   */
   abstract write(): void

  /**
   * Deletes a store file / directory.
   *
   */
  public deleteStore(): void {
    const storePath = this._storePath;
    if (!existsSync(storePath)) {
      throw new Error(`${storePath} not exists`);
    }
    Deno.removeSync(storePath);
    return;
  }
}
