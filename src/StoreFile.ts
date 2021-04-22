import { dirname, existsSync, fromFileUrl, resolve } from "./deps.ts";
import { Store } from "./Store.ts";
import { StoreNotFoundError } from "./Errors.ts";
import type { Config, Finder, Value, ValueOrFunction } from "./types.ts";

import { debounce } from "./helpers.ts";
/**
 * A database in RAM with persistance plain text as JSON.
 * For non persistance use Store
 */
export abstract class StoreFile extends Store {
  /**
   * The file path in which to store the data in.
   */
  protected _storePath: string;
  protected _autoSave = false;

  /**
   * Create a new {Store} instance.
   * If no custom path is given, it defaults to mainModulePath/.store.yaml
   *
   * @param storePath A custom path where to write data
   */
  constructor(config?: Config) {
    super(config);
    this._autoSave = config?.autoSave ?? false;
    const filename = config?.filename || ".store.db";
    const folder = config?.folder || fromFileUrl(dirname(Deno.mainModule));
    this._storePath = resolve(folder, filename);
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
      this.writeLazy();
    }
    return returned;
  }
  public push(path: string, ...values: Value[]): Value {
    const returned = super.push(path, ...values);
    if (this._autoSave) {
      this.writeLazy();
    }
    return returned;
  }
  public remove(path: string, returnRemoved = true): Value {
    const returned = super.remove(path, returnRemoved);
    if (this._autoSave) {
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
    if (this._autoSave) {
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
    if (this._autoSave) {
      this.writeLazy();
    }
    return returned;
  }

  /**
   * Load stored data from disk into cache.
   */
  abstract load(): void;
  /**
   * Writes cached data to disk.
   *
   */
  abstract write(): void;

  // public writeLazy = () => {
  //   this.write();
  //   console.count('written');
  // }
  public writeLazy: () => void = debounce(
    () => {
      this.write();
    },
    0,
    this,
  );

  /**
   * Deletes a store file .
   *
   */
  public deleteStore(): void {
    const storePath = this._storePath;
    if (!existsSync(storePath)) {
      throw new StoreNotFoundError(`${storePath} not exists`);
    }
    Deno.removeSync(storePath);
    return;
  }
}
