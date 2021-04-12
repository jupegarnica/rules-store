import { existsSync } from './deps.ts';
import { deepSet, deepGet, calcHash } from './helpers.ts';

type Subscriber = (data: unknown) => void;
type Subscription = {
  callback: Subscriber;
  hash: string;
  keys: string;
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
    this._decoder = new TextDecoder('utf-8');
    this._encoder = new TextEncoder();
    this._storePath = storePath
      ? storePath
      : `${new URL('.store.json', Deno.mainModule).pathname}`;
    this._data = {};
    this._dataHash = '';
    this._lastKnownStoreHash = '';
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
      const { keys, callback } = subscription;
      const value = this.get(keys);

      const newHash = calcHash(value);
      if (newHash !== subscription.hash) {
        callback(value);
        subscription.hash = newHash;
      }
    }
  }

  /**
   * Retrieves a value from database by specified key.
   *
   * @param key The key
   * @returns The value
   */
  public get(keys: string) {
    return deepGet(this._data, keys);
  }

  /**
   * Set's a value in the database by the specified key.
   *
   * @param key The key
   * @param value The new value
   */
  public set(keys: string, value: Value) {

    deepSet(this._data, keys, value);

    this._notify();

    // Store new hash.
    this._dataHash = calcHash(this._data);

    return value;
  }
  public delete(keys: string) {
    const oldValue = this.get(keys);

    deepSet(this._data, keys, undefined);

    this._notify();

    // Store new hash.
    this._dataHash = calcHash(this._data);

    return oldValue;
  }

  public on(keys: string, callback: Subscriber): Value {
    const value = this.get(keys);
    this._subscriptions.push({
      callback,
      hash: calcHash(value),
      keys,
    });
    callback(value);
    return value;
  }
  public off(keys: string, callback: Subscriber): void {
    const oldLength = this._subscriptions.length;

    this._subscriptions = this._subscriptions.filter(
      (subscription) =>
        !(
          subscription.keys === keys &&
          subscription.callback === callback
        ),
    );

    if (oldLength === this._subscriptions.length) {
      throw new Error('no subscription found');
    }
  }

  /**
   * Check whether a key is stored inside the database.
   *
   * @param key Lookup key
   * @returns Whether the key is stored in the database
   */
  public contains(key: string): boolean {
    return key in this._data;
  }

  // =====================    MANAGEMENT

  /**
   * Writes cached data to disk.
   * Won't perform write if the last known hash from the store file
   * matches the current cache hash.
   *
   * @param storePath Custom file path used by write operation
   * @param force Ignore hashe comparison and force write
   */
  public async write(
    storePath?: string,
    force = false,
  ): Promise<void> {
    // Write probably not necessary.
    if (!force && this._lastKnownStoreHash === this._dataHash)
      return;
    if (!storePath) storePath = this._storePath;

    // Write data.
    const data = JSON.stringify({
      _hash: this._dataHash,
      data: this._data,
    });
    return await Deno.writeFile(
      storePath,
      this._encoder.encode(data),
    );
  }

  /**
   * Deletes a store file / directory.
   *
   * @param storePath Custom path used by delete operation. Defaults to the default storage file path
   */
  public async deleteStore(storePath?: string): Promise<void> {
    if (!storePath) storePath = this._storePath;
    if (!existsSync(storePath))
      throw new Error(`${storePath} not exists`);
    return await Deno.remove(storePath);
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
