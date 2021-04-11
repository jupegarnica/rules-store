import { createHash, existsSync } from './deps.ts';
import { deepSet, deepGet } from './helpers.ts';
export type Subscription = (data: unknown) => void;

// deno-lint-ignore no-explicit-any
type Value = any;
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
  private _cache: { [name: string]: Value };

  /**
   * The hashed value of currently cached data.
   */
  private _cacheHash: string;

  /**
   * Stores the last known hash from store file.
   */
  private _lastKnownStoreHash: string;

  private _subscriptions: { [key: string]: Subscription[] } = {};
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
    this._cache = {};
    this._cacheHash = '';
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
    if (!force && decoded._hash === this._cacheHash) return;

    // Store new data.
    this._cache = decoded.data;
    this._lastKnownStoreHash = decoded._hash;

    return;
  }

  private _notify(keys: string, value: Value, oldValue: Value) {
    if (this._subscriptions[keys]?.length) {
      const runCallback = (cb: Subscription) => cb(value);
      this._subscriptions[keys].forEach(runCallback);
    }
  }

  // =====================    DATA ACCESS

  /**
   * Retrieves a value from database by specified key.
   *
   * @param key The key
   * @returns The value
   */
  public get(keys: string) {
    return deepGet(this._cache, keys);
  }

  /**
   * Set's a value in the database by the specified key.
   *
   * @param key The key
   * @param value The new value
   * @param override Whether to overide the value if it's already stored
   */
  public set(keys: string, value: Value, override = true) {
    const oldValue = this.get(keys);

    // Prevent override.
    if (oldValue === undefined && !override)
      throw new Error('Override not allowed');

    deepSet(this._cache, keys, value);

    this._notify(keys, value, oldValue);

    // Calculate new hash.
    const hash = createHash('sha1');
    hash.update(JSON.stringify(this._cache.valueOf()));
    // Store new hash.
    this._cacheHash = hash.toString();

    return value;
  }

  public on(keys: string, callback: Subscription): Value {
    this._subscriptions[keys] ||= [];
    this._subscriptions[keys].push(callback);
    const value = this.get(keys);
    callback(value);
    return value;
  }
  public off(keys: string, callback: Subscription): void {
    if (!this._subscriptions[keys]) throw new Error('Not Found');
    const index = this._subscriptions[keys].findIndex(
      (cb) => cb === callback,
    );

    if (index < 0) throw new Error('Not Found');

    this._subscriptions[keys].splice(index, 1);
  }

  /**
   * Check whether a key is stored inside the database.
   *
   * @param key Lookup key
   * @returns Whether the key is stored in the database
   */
  public contains(key: string): boolean {
    return key in this._cache;
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
    if (!force && this._lastKnownStoreHash === this._cacheHash)
      return;
    if (!storePath) storePath = this._storePath;

    // Write data.
    const data = JSON.stringify({
      _hash: this._cacheHash,
      data: this._cache,
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
