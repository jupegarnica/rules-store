import {
  calcHash,
  deepGet,
  deepSet,
  getKeys,
  isValidNumber,
} from "./helpers.ts";

import type { Data, Subscriber, Subscription, Value } from "./types.ts";
/**
 * A database in RAM without persistance.
 * For persistance use StoreJson
 */
export class Store {
  /**
   * The actual data cache.
   */
  protected _data: Data;

  /**
   * The hashed value of currently cached data.
   */
  protected _dataHash: string;

  /**
   * Stores the last known hash from store file.
   */
  protected _lastKnownStoreHash: string;

  protected _subscriptions: Subscription[] = [];

  /**
   * Create a new {Store} instance.
   * If no custom path is given, it defaults to mainModulePath/.store.json
   *
   * @param storePath A custom path where to write data
   */
  constructor() {
    this._data = {};
    this._dataHash = "";
    this._lastKnownStoreHash = "";
  }
  /**
   * Load stored data from disk into cache.
   * Won't update cache values if hash in store file matches current cache file.
   *
   * @param storePath Custom file path used by read operation
   * @param force Ignore hash comparison and force read
   */

  protected _notify() {
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
  protected _addDataHash() {
    this._dataHash = calcHash(this._data);
  }
  /**
   * Retrieves a value from database by specified path.
   * The path can be an string delimited by . / or \
   * As:
   * 'a.b.c'
   * '/a/b/c' same as 'a/b/c'  or 'a/b/c/'
   * '\\a\\b\\c'  escaped \
   *
   * @param key The key
   * @returnss The value found or undefined if not found
   */
  public get(path: string): Value {
    return deepGet(this._data, path);
  }

  /**
   * Sets a value in the database by the specified path.
   * The path can be an string delimited by . / or \
   * As:
   * 'a.b.c'
   * '/a/b/c' same as 'a/b/c'  or 'a/b/c/'
   * '\\a\\b\\c'  escaped \
   *
   * @param path The path
   * @param value The new value
   * @returns  The value added
   *
   */
  public set(path: string, value: Value):Value {
    deepSet(this._data, path, value);
    this._notify();

    this._addDataHash();

    return value;
  }

  /**
   * Remove a value in the database by the specified path.
   * If pointing to an array item, the item will be remove, as array.splice(index,1)
   *
   * @param path The path
   * @returns  The value removed
   *
   */
  public remove(path: string): Value {
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
  /**
   * Add a new item in an array
   * It will throw an error if the path is not pointing to an array
   *
   * @param path The path
   * @param value The value
   * @returns  The value pushed
   */
  public push(path: string, value: Value): Value {
    const oldValue = this.get(path);
    if (!Array.isArray(oldValue)) {
      throw new Error("is not an Array");
    }

    oldValue.push(value);

    this._notify();

    this._addDataHash();

    return value;
  }
  /**
   * Subscribe to changes in the path
   * It will run the callback if the path value has changed
   * Also runs the callback during subscription for the first time
   *
   * @param path The path
   * @param callback A function to be called when the value has changed and during subscription
   * @returns  The value changed
   */
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

  /**
   * Unsubscribe to changes in the path
   *
   * @param path The path
   * @param callback A reference to the callback used in the subscription
   */

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
}
