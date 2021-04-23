import {
  addChildToKeys,
  applyCloneOnGet,
  deepClone,
  deepGet,
  deepSet,
  findDeepestRule,
  isNumberKey,
  isObject,
  keysFromPath,
  pathFromKeys,
} from "./helpers.ts";

import { equal } from "./deps.ts";
import type {
  BaseConfig,
  Data,
  Finder,
  Keys,
  KeyValue,
  RuleContext,
  Rules,
  Subscriber,
  Subscription,
  Value,
  ValueOrFunction,
} from "./types.ts";
import { PermissionError, SubscriptionNotFoundError } from "./Errors.ts";

import { allowAll } from "./rules.ts";

/**
 * A database in RAM heavily inspired from firebase realtime database.
 *
 */
export class Store {
  /**
   * The actual store cache.
   */
  #data: Data = {};
  #newData: Data = {};

  public get _data() {
    return this.#data;
  }
  protected setData(data: Data) {
    this.#data = data;
  }
  public get _newData() {
    return this.#newData;
  }
  /**
   * Create a new Store instance.
   *
   * @param {BaseConfig} config - The configuration
   * @param {Rules} config.rules - it defaults to allowAll
   *
   * */

  constructor(config?: BaseConfig) {
    this._rules = config?.rules ?? allowAll;
    this.#data = config?.initialDataIfNoFile ?? {};
    this.#newData = config?.initialDataIfNoFile ?? {};
  }

  private _get(keys: Keys): Value {
    return deepGet(this.#data, keys);
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
    const keys = keysFromPath(path);
    return deepClone(this._getAndCheck(keys));
  }

  private _getAndCheck(keys: Keys): Value {
    this._checkRule("_read", keys);
    return (this._get(keys));
  }

  private _set(keys: Keys, value: Value): void {
    deepSet(this._newData, keys, value);
    try {
      this._checkRule("_write", keys);
    } catch (error) {
      this._rollBack(keys);
      throw error;
    }
    this._commit(keys, value);
  }
  private _commit(keys: Keys, value: Value): void {
    this._notify();
    deepSet(this.#data, keys, value);
  }
  private _rollBack(keys: Keys): void {
    const oldData = (deepGet(this.#data, keys));
    deepSet(this._newData, keys, oldData);
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
   * @returns  The value added
   *
   */
  public set(
    path: string,
    valueOrFunction: ValueOrFunction,
  ): Value {
    const keys = keysFromPath(path);
    if (keys.length === 0) {
      throw new PermissionError("Root path cannot be set");
    }

    let newValue;
    if (typeof valueOrFunction === "function") {
      const oldValue = this._getAndCheck(keys);
      newValue = valueOrFunction(deepClone(oldValue));
    } else {
      newValue = deepClone(valueOrFunction);
    }

    this._set(keys, newValue);

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
  public remove(path: string, returnRemoved = true): Value | void {
    const keys = keysFromPath(path);
    const lastKey = keys[keys.length - 1];
    let oldValue;
    if (returnRemoved) {
      oldValue = this.get(pathFromKeys(keys));
    }
    if (isNumberKey(lastKey)) {
      // remove array child
      this._set(keys, undefined);
      keys.pop();
      const parentValue = this._get(keys);
      parentValue.splice(Number(lastKey), 1);
    } else {
      // remove object key
      this._set(keys, undefined);
    }

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
    const keys = keysFromPath(path);
    const oldValue = this._get(keys);
    if (!Array.isArray(oldValue)) {
      throw new TypeError("Target is not an Array");
    }

    const cloned = (values);
    const initialLength = oldValue.length;
    for (const index in cloned) {
      const targetIndex = initialLength + Number(index);
      this._set(addChildToKeys(keys, String(targetIndex)), cloned[index]);
    }

    return cloned.length > 1 ? cloned : cloned[0];
  }

  /**
   * Find some children
   *
   * @param path The path to the target to perform the search
   * @param finder If the finder returns a truthy value that key (or item in an array) will be returned
   * ([key,value]) => any
   * @returns  An array of pairs [key,value] found
   */
  public find(path: string, finder: Finder): KeyValue[] {
    const keys = keysFromPath(path);
    let target = this._get(keys);
    if (!isObject(target)) {
      throw new TypeError("Target not object or array");
    }
    target = (target);
    const results = [] as KeyValue[];
    for (const key in target) {
      this._checkRule("_read", addChildToKeys(keys, key));
      const value = (target[key]);
      const pair = [key, value] as KeyValue;

      applyCloneOnGet(pair, "1", value);
      if (finder(pair)) {
        results.push(pair);
      }
    }
    return results;
  }

  /**
   * Find one child
   *
   * @param path The path to the target to perform the search
   * @param finder If the finder returns a truthy value that key (or item in an array) will be returned
   * ([key,value]) => any
   * @returns  A pair [key,value] returned
   */
  public findOne(
    path: string,
    finder: Finder,
  ): KeyValue {
    const keys = keysFromPath(path);

    const target = this._getAndCheck(keys);
    if (!isObject(target)) {
      throw new TypeError("Target not object or array");
    }
    // target = deepClone(target);
    for (const key in target) {
      this._checkRule("_read", addChildToKeys(keys, key));
      const value = target[key];
      const pair = [key, value] as KeyValue;

      applyCloneOnGet(pair, "1", value);
      if (finder(pair)) {
        return pair;
      }
    }
    return ["", undefined];
  }

  /**
   * Find some children and remove it
   *
   * @param {string}  path The path to the target to perform the search
   * @param {Function} finder If the finder returns a truthy value that key (or item in an array) will be remove
   * ([key,value]) => any
   * @param {boolean} returnsRemoved do not return the removed value in order to not check against the read rule.  Defaults to true,
   * @returns  An array of pairs [key,value] removed
   */
  public findAndRemove(
    path: string,
    finder: Finder,
    returnsRemoved = true,
  ): KeyValue[] {
    const results = returnsRemoved ? this.find(path, finder) : [];
    const keys = keysFromPath(path);
    for (let index = results.length - 1; index >= 0; index--) {
      const [key] = results[index];
      const keysToRemove = addChildToKeys(keys, key);
      this.remove(pathFromKeys(keysToRemove), returnsRemoved);
    }

    return results;
  }

  /**
   * Find one child and remove it
   *
   * @param path The path to the target to perform the search
   * @param finder If the finder returns a truthy value that key (or item in an array) will be remove
   * ([key,value]) => any
   * @returns  A pair [key,value] removed
   */
  public findOneAndRemove(
    path: string,
    finder: Finder,
    returnsRemoved = true,
  ): KeyValue | void {
    const result = returnsRemoved ? this.findOne(path, finder) : undefined;
    const keys = keysFromPath(path);
    if (result) {
      const keysToRemove = addChildToKeys(keys, result[0]);
      this.remove(pathFromKeys(keysToRemove), returnsRemoved);
    }

    return result;
  }
  // SUBSCRIPTIONS
  /////////////////
  protected _subscriptions: Subscription[] = [];

  /**
   * Subscribe to changes in the path
   * It will run the callback only if the path value has changed
   *
   * @param path The path
   * @param callback A function to be called when the value has changed and during subscription
   * @returns  The value
   */
  public subscribe(path: string, callback: Subscriber): Value {
    const keys = keysFromPath(path);
    this._checkRule("_read", keys);
    const value = deepClone(this._get(keys));
    this._subscriptions.push({
      callback,
      value,
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
      throw new SubscriptionNotFoundError("no subscription found");
    }
  }

  protected _notify() {
    for (const subscription of this._subscriptions) {
      const { path, callback } = subscription;
      const keys = keysFromPath(path);
      this._checkRule("_read", keys);
      const data = deepGet(this.#data, keys);
      const newData = deepGet(this._newData, keys);
      if (!equal(data, newData)) {
        callback(newData);
      }
    }
  }

  // RULES
  ////////
  protected _rules: Rules;

  private _checkRule(
    ruleType: "_read" | "_write",
    keys: Keys,
  ): void {
    const ruleAndParams = findDeepestRule(
      keys,
      ruleType,
      this._rules,
    );

    const rule = ruleAndParams[ruleType];
    const params = ruleAndParams.params;
    const rulePath = ruleAndParams.rulePath;
    try {
      if (typeof rule !== "function") {
        throw new PermissionError(
          `Not explicit permission to ${
            ruleType.replace(
              "_",
              "",
            )
          }`,
        );
      }
      const ruleContext = {
        params,
      };
      applyCloneOnGet(ruleContext, "data", deepGet(this.#data, rulePath));
      applyCloneOnGet(ruleContext, "rootData", this.#data);

      if (ruleType === "_write") {
        applyCloneOnGet(
          ruleContext,
          "newData",
          deepGet(this.#newData, rulePath),
        );
      }
      const allowed = rule?.(ruleContext as RuleContext);

      if (!allowed) {
        throw new PermissionError(
          `${
            ruleType.replace(
              "_",
              "",
            )
          } disallowed at path ${pathFromKeys(rulePath)}`,
        );
      }
      return;
    } catch (error) {
      throw error;
    }
  }
}
