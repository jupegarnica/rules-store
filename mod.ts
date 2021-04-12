import { existsSync } from "./deps.ts";
import {
  calcHash,
  deepGet,
  deepSet,
  getKeys,
  isValidNumber,
} from "./helpers.ts";

type Subscriber = (data: unknown) => void;
type Subscription = {
  callback: Subscriber;
  hash: string;
  path: string;
};

// deno-lint-ignore no-explicit-any
type Value = any;
type Data = { [key: string]: Value };

/**
 * A super simple key-value database.
 * Keys always are strings.
 * Value type can be specified through generics.
 */
export class Store {
  // =====================    PROPS

  /**
   * Reference to the decoder which is used to load store files.
   */
  private _decoder: TextDecoder;

  /**
   * Reference to the encoder which is used to write store files.
   */
  private _encoder: TextEncoder;

  /**
   * The file path in which to store the data in.
   */
  private _storePath: string;

  /**
   * The actual data cache.
   */
  private _data: Data;

  /**
   * The hashed value of currently cached data.
   */
  private _dataHash: string;

  /**
   * Stores the last known hash from store file.
   */
  private _lastKnownStoreHash: string;

  private _subscriptions: Subscription[] = [];
  // =====================    CONSTRUCTOR

  /**
   * Create a new {Store} instance.
   * If no custom path is given, it defaults to mainModulePath/.store.json
   *
   * @param storePath A custom path where to write data
   */
  constructor(storePath?: string) {
    this._decoder = new TextDecoder("utf-8");
    this._encoder = new TextEncoder();
    this._storePath = storePath
      ? storePath
      : `${new URL(".store.json", Deno.mainModule).pathname}`;
    this._data = {};
    this._dataHash = "";
    this._lastKnownStoreHash = "";
    this.load();
  }
  /**
   * Load stored data from disk into cache.
   * Won't update cache values if hash in store file matches current cache file.
   * // TODO: Store & Check file hash.
   *
   * @param storePath Custom file path used by read operation
   * @param force Ignore hash comparison and force read
   */
  private load(storePath?: string, force = false): void {
    if (!storePath) storePath = this._storePath;
    if (!existsSync(storePath)) return;

    // Load data from file.
    const data = Deno.readFileSync(storePath);
    const decoded = JSON.parse(this._decoder.decode(data));

    // Reload probably not necessary.
    if (!force && decoded._hash === this._dataHash) return;

    // Store new data.
    this._data = decoded.data;
    this._lastKnownStoreHash = decoded._hash;

    return;
  }

  private _notify() {
    for (const subscription of this._subscriptions) {
      const { path, callback } = subscription;
      const value = this.get(path);

      const newHash = calcHash(value);
      if (newHash !== subscription.hash) {
        callback(value);
        subscription.hash = newHash;
      }
    }
  }
  private _addDataHash() {
    this._dataHash = calcHash(this._data);
  }
  /**
   * Retrieves a value from database by specified key.
   *
   * @param key The key
   * @returns The value
   */
  public get(path: string) {
    return deepGet(this._data, path);
  }

  /**
   * Set's a value in the database by the specified key.
   *
   * @param key The key
   * @param value The new value
   */
  public set(path: string, value: Value) {
    deepSet(this._data, path, value);

    this._notify();

    this._addDataHash();

    return value;
  }
  public remove(path: string) {
    const oldValue = this.get(path);
    const keys = getKeys(path);
    const lastKey = keys[keys.length - 1];

    if (isValidNumber(lastKey)) {
      // remove array child
      keys.pop();
      const parentValue = this.get(keys.join("."));
      parentValue.splice(Number(lastKey), 1);
    } else {
      // remove object key
      deepSet(this._data, path, undefined);
    }

    this._notify();

    this._addDataHash();

    return oldValue;
  }
  public push(path: string, value: Value) {
    const oldValue = this.get(path);
    if (!Array.isArray(oldValue)) {
      throw new Error("is not an Array");
    }

    oldValue.push(value);

    this._notify();

    this._addDataHash();

    return value;
  }

  public on(path: string, callback: Subscriber): Value {
    const value = this.get(path);
    this._subscriptions.push({
      callback,
      hash: calcHash(value),
      path,
    });
    callback(value);
    return value;
  }
  public off(path: string, callback: Subscriber): void {
    const oldLength = this._subscriptions.length;

    this._subscriptions = this._subscriptions.filter(
      (subscription) =>
        !(
          subscription.path === path &&
          subscription.callback === callback
        ),
    );

    if (oldLength === this._subscriptions.length) {
      throw new Error("no subscription found");
    }
  }

  /**
   * Check whether a key is stored inside the database.
   *
   * @param key Lookup key
   * @returns Whether the key is stored in the database
   */
  // TODO: make it work with deep
  // public contains(key: string): boolean {
  //   return key in this._data;
  // }

  // =====================    MANAGEMENT

  /**
   * Writes cached data to disk.
   * Won't perform write if the last known hash from the store file
   * matches the current cache hash.
   *
   * @param storePath Custom file path used by write operation
   * @param force Ignore hashe comparison and force write
   */
  public write(
    storePath?: string,
    force = false,
  ): void {
    // Write probably not necessary.
    if (!force && this._lastKnownStoreHash === this._dataHash) {
      return;
    }
    if (!storePath) storePath = this._storePath;

    // Write data.
    const data = JSON.stringify({
      _hash: this._dataHash,
      data: this._data,
    });
    return Deno.writeFileSync(
      storePath,
      this._encoder.encode(data),
    );
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

  // =====================    GETTER & SETTER

  /**
   * Return internal storePath.
   */
  public get storePath(): string {
    return this._storePath;
  }

  /**
   * Set internal storePath.
   *
   * @param {string} storePath The new path
   */
  public set storePath(storePath: string) {
    this._storePath = storePath;
  }
}
