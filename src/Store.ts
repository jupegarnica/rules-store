import {
  deepClone,
  deepGet,
  deepSet,
  getKeys,
  isValidNumber,
} from "./helpers.ts";

import { equal } from "./deps.ts";
import type {
  Data,
  Finder,
  Subscriber,
  Subscription,
  Value,
  ValueOrFunction,
} from "./types.ts";
/**
 * A database in RAM without persistance.
 * For persistance use StoreJson
 */
export class Store {
  /**
   * The actual data cache.
   */
  protected _data: Data = {};

  /**
   * The hashed value of currently cached data.
   */
  protected _dataHash = "";

  /**
   * Stores the last known hash from store file.
   */
  protected _lastKnownStoreHash = "";

  protected _subscriptions: Subscription[] = [];

  /**
   * Create a new {Store} instance without persistance.
   *
   */
  constructor() {}

  protected _notify() {
    for (const subscription of this._subscriptions) {
      const { path, callback } = subscription;
      const value = this.get(path);
      if (!equal(value, subscription.value)) {
        callback(value);
        subscription.value = value;
      }
    }
  }
  private _get(path: string): Value {
    return deepGet(this._data, path);
  }
  /**
   * Retrieves a value from database by specified path.
   *
   * @param path The path can be an string delimited by . / or \
   * As:
   * 'a.b.c'
   * '/a/b/c' same as 'a/b/c'  or 'a/b/c/'
   * '\\a\\b\\c'  escaped \
   * @returns The cloned value found or undefined if not found
   */

  public get(path: string): Value {
    const v = this._get(path);
    const c = deepClone(v);
    return c;
  }

  /**
   * Sets a value in the database by the specified path.
   *
   * @param path  The path can be an string delimited by . / or \
   * As:
   * 'a.b.c'
   * '/a/b/c' same as 'a/b/c'  or 'a/b/c/'
   * '\\a\\b\\c'  escaped \
   *
   * @param valueOrFunction The new value or a function to run with the oldValue
   * @returns  The cloned value added
   *
   */

  public set(
    path: string,
    valueOrFunction: ValueOrFunction,
  ): Value {
    let newValue;
    if (typeof valueOrFunction === "function") {
      const oldValue = this._get(path);
      newValue = valueOrFunction(oldValue);
    } else {
      newValue = valueOrFunction;
    }
    newValue = deepClone(newValue);
    deepSet(this._data, path, newValue);
    this._notify();
    return newValue;
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
    const oldValue = this._get(path);
    const keys = getKeys(path);
    const lastKey = keys[keys.length - 1];

    if (isValidNumber(lastKey)) {
      // remove array child
      keys.pop();
      const parentValue = this._get(keys.join("."));
      parentValue.splice(Number(lastKey), 1);
    } else {
      // remove object key
      deepSet(this._data, path, undefined);
    }

    this._notify();

    return oldValue;
  }
  /**
   * Add a new item in an array
   * It will throw an error if the path is not pointing to an array
   *
   * @param path The path
   * @param values The values
   * @returns  The value pushed or and array with all the value pushed
   */
  public push(
    path: string,
    ...values: Value[]
  ): Value | Value[] {
    const cloned = deepClone(values);
    const oldValue = this._get(path);
    if (!Array.isArray(oldValue)) {
      throw new Error("is not an Array");
    }

    oldValue.push(...cloned);

    this._notify();

    return cloned.length > 1 ? cloned : cloned[0];
  }

  /**
   * Find some children
   *
   * @param path The path to the target to perform the search
   * @param finder If the finder returns a truthy value that key (or item in an array) will be returned
   * (value: any, key: string) => any
   * @returns  An array of pairs [key,value] found
   */
  public find(path: string, finder: Finder): [string, Value][] {
    const target = this.get(path);
    const results = [] as [string, Value][];
    for (const key in target) {
      if (Object.prototype.hasOwnProperty.call(target, key)) {
        const value = target[key];
        if (finder(value, key)) {
          results.push([key, value]);
        }
      }
    }
    return results;
  }

  /**
   * Find one child
   *
   * @param path The path to the target to perform the search
   * @param finder If the finder returns a truthy value that key (or item in an array) will be returned
   * (value: any, key: string) => any
   * @returns  A pair [key,value] returned
   */
  public findOne(
    path: string,
    finder: Finder,
  ): [string, Value] | void {
    const target = this.get(path);
    for (const key in target) {
      if (Object.prototype.hasOwnProperty.call(target, key)) {
        const value = target[key];
        if (finder(value, key)) {
          return [key, value];
        }
      }
    }
  }

  /**
   * Find some children and remove it
   *
   * @param path The path to the target to perform the search
   * @param finder If the finder returns a truthy value that key (or item in an array) will be remove
   * (value: any, key: string) => any
   * @returns  An array of pairs [key,value] removed
   */
  public findAndRemove(
    path: string,
    finder: Finder,
  ): [string, Value][] {
    const results = this.find(path, finder);
    for (let index = results.length - 1; index >= 0; index--) {
      const [key] = results[index];
      const pathToRemove = [...getKeys(path), key].join(".");
      this.remove(pathToRemove);
    }

    return results;
  }

  /**
   * Find one child and remove it
   *
   * @param path The path to the target to perform the search
   * @param finder If the finder returns a truthy value that key (or item in an array) will be remove
   * (value: any, key: string) => any
   * @returns  A pair [key,value] removed
   */
  public findOneAndRemove(
    path: string,
    finder: Finder,
  ): [string, Value] | void {
    const result = this.findOne(path, finder);
    if (result) {
      const pathToRemove = [...getKeys(path), result[0]].join(
        ".",
      );
      this.remove(pathToRemove);
    }

    return result;
  }
  /**
   * Subscribe to changes in the path
   * It will run the callback only if the path value has changed
   *
   * @param path The path
   * @param callback A function to be called when the value has changed and during subscription
   * @returns  The value
   */

  public subscribe(path: string, callback: Subscriber): Value {
    const value = this.get(path);
    this._subscriptions.push({
      callback,
      value: value,
      path,
    });
    return value;
  }

  /**
   * Subscribe to changes in the path
   * It will run the callback if the path value has changed
   * Also runs the callback on the first time
   *
   * @param path The path
   * @param callback A function to be called when the value has changed and during subscription
   * @returns  The value
   */
  public on(path: string, callback: Subscriber): Value {
    const value = this.subscribe(path, callback);
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
