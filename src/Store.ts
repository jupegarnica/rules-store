import {
  addChildToKeys,
  deepClone,
  deepGet,
  deepSet,
  findRuleAndParams,
  getKeys,
  isObject,
  isValidNumber,
} from "./helpers.ts";

import { equal } from "./deps.ts";
import type {
  BaseConfig,
  Data,
  Finder,
  Rules,
  Subscriber,
  Subscription,
  Value,
  ValueOrFunction,
} from "./types.ts";

const defaultRules = {};

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
   * The actual rules
   */
  protected _rules: Rules;

  protected _subscriptions: Subscription[] = [];

  /**
   * Create a new {Store} instance without persistance.
   *
   */
  constructor(config?: BaseConfig) {
    this._rules = config?.rules ?? defaultRules;
  }

  private _get(keys: string[]): Value {
    return deepGet(this._data, keys);
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
    const keys = getKeys(path);
    this._checkReadRules(keys);
    return deepClone(this._get(keys));
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
    const keys = getKeys(path);
    if (keys.length === 0) {
      throw new Error("Root path cannot be set");
    }
    this._checkWriteRules(keys);

    let newValue;
    if (typeof valueOrFunction === "function") {
      const oldValue = this._get(keys);
      newValue = valueOrFunction(oldValue);
    } else {
      newValue = valueOrFunction;
    }
    newValue = deepClone(newValue);
    deepSet(this._data, keys, newValue);
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
    const keys = getKeys(path);
    this._checkWriteRules(keys);
    this._checkReadRules(keys);
    const oldValue = this._get(keys);
    const lastKey = keys[keys.length - 1];

    if (isValidNumber(lastKey)) {
      // remove array child
      keys.pop();
      const parentValue = this._get(keys);
      parentValue.splice(Number(lastKey), 1);
    } else {
      // remove object key
      deepSet(this._data, keys, undefined);
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
    const keys = getKeys(path);
    this._checkWriteRules(keys);
    const cloned = deepClone(values);
    const oldValue = this._get(keys);
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
    const keys = getKeys(path);
    let target = this._get(keys);
    if (!isObject(target)) {
      throw new Error("Target not object or array");
    }
    target = deepClone(target);
    const results = [] as [string, Value][];
    for (const key in target) {
      if (Object.prototype.hasOwnProperty.call(target, key)) {
        this._checkReadRules(addChildToKeys(keys, key));
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
    let target = this.get(path);
    if (!isObject(target)) {
      throw new Error("Target not object or array");
    }
    target = deepClone(target);
    const keys = getKeys(path);
    for (const key in target) {
      if (Object.prototype.hasOwnProperty.call(target, key)) {
        this._checkReadRules(addChildToKeys(keys, key));
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
  // SUBSCRIPTIONS
  /////////////////

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

  // RULES
  ////////

  private _checkRule(
    ruleType: "_read" | "_write",
    keys: string[],
  ) {
    // check rules from bottom to top
    for (let index = keys.length; index >= 0; index--) {
      const currentPath = keys.slice(0, index);

      const rulePath = addChildToKeys(currentPath, ruleType);
      const ruleAndParams = findRuleAndParams(rulePath, ruleType, this._rules);
      const rule = ruleAndParams[ruleType];
      const params = ruleAndParams.params;
      if (typeof rule === "function") {
        try {
          const data = this._get(currentPath);
          const allowed = rule({ data, params });

          if (!allowed) {
            throw new Error(
              `${
                ruleType.replace(
                  "_",
                  "",
                )
              } disallowed at path /${currentPath.join("/")}`,
            );
          }
          return;
        } catch (error) {
          throw error;
        }
      }
    }
  }
  protected _checkReadRules(keys: string[]): void {
    this._checkRule("_read", keys);
  }

  protected _checkWriteRules(keys: string[]): void {
    this._checkRule("_write", keys);
  }
}
