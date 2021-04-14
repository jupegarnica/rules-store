import { existsSync } from "./deps.ts";
import {
  parse,
  stringify,
} from "https://deno.land/std@0.92.0/encoding/yaml.ts";
import { Store } from "./Store.ts";

import type { Value } from "./types.ts";
/**
 * A database in RAM with persistance plain text as JSON.
 * For non persistance use Store
 */
export class StoreYaml extends Store {
  /**
   * The file path in which to store the data in.
   */
  private _storePath: string;
  /**
   * Create a new {Store} instance.
   * If no custom path is given, it defaults to mainModulePath/.store.yaml
   *
   * @param storePath A custom path where to write data
   */
  constructor(storePath?: string) {
    super();
    this._storePath = storePath
      ? storePath
      : `${new URL(".store.yaml", Deno.mainModule).pathname}`;
    this.load();
  }
  /**
   * Return internal storePath.
   */
  public get storePath(): string {
    return this._storePath;
  }
  /**
   * Load stored data from disk into cache.
   * Won't update cache values if hash in store file matches current cache file.
   *
   * @param storePath Custom file path used by read operation
   * @param force Ignore hash comparison and force read
   */
  private load(storePath?: string, force = false): void {
    if (!storePath) storePath = this._storePath;
    else this._storePath = storePath;
    if (!existsSync(storePath)) return;

    // Load data from file.
    const data = Deno.readFileSync(storePath);
    const decoder = new TextDecoder("utf-8");
    const decoded: Value = parse(decoder.decode(data));

    // Reload probably not necessary.
    if (!force && decoded._hash === this._dataHash) return;

    // Store new data.
    this._data = decoded.data;
    this._lastKnownStoreHash = decoded._hash;

    return;
  }

  /**
   * Writes cached data to disk.
   * Won't perform write if the last known hash from the store file
   * matches the current cache hash.
   *
   * @param storePath Custom file path used by write operation
   * @param force Ignore hashe comparison and force write
   */
  public write(storePath?: string, force = false): void {
    // Write probably not necessary.
    if (!force && this._lastKnownStoreHash === this._dataHash) {
      return;
    }
    if (!storePath) storePath = this._storePath;

    // Write data.
    const data = stringify({
      _hash: this._dataHash,
      data: this._data,
    });
    const encoder = new TextEncoder();
    return Deno.writeFileSync(storePath, encoder.encode(data));
  }

  /**
   * Deletes a store file / directory.
   *
   * @param storePath Custom path used by delete operation. Defaults to the default storage file path
   */
  public deleteStore(storePath?: string): void {
    if (!storePath) storePath = this._storePath;
    if (!existsSync(storePath)) {
      throw new Error(`${storePath} not exists`);
    }
    return Deno.removeSync(storePath);
  }
}