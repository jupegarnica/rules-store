import {
  addChildToKeys,
  deepClone,
  deepGet,
  deepSet,
  findRuleAndParams,
  isObject,
  isValidNumber,
  keysFromPath,
  pathFromKeys,
} from "./helpers.ts";

import { equal } from "./deps.ts";
import type {
  BaseConfig,
  Data,
  Finder,
  Keys,
  RuleContext,
  Rules,
  Subscriber,
  Subscription,
  Value,
  ValueOrFunction,
} from "./types.ts";
import { PermissionError, SubscriptionNotFoundError } from "./Errors.ts";

const allowAllRules = {
  _read: () => true,
  _write: () => true,
};

/**
 * A database in RAM without persistance.
 * For persistance use StoreJson
 */
export class Store {
  /**
   * The actual data cache.
   */
  protected _data: Data = {};
  protected _dataBackup = "{}";
  /**
   * The actual rules
   */
  protected _rules: Rules;
  protected _cloneData = false;
  protected _subscriptions: Subscription[] = [];

  /**
   * Create a new {Store} instance without persistance.
   *
   */
  constructor(config?: BaseConfig) {
    this._rules = config?.rules ?? allowAllRules;
    this._cloneData = config?.cloneData ?? false;
  }

  private _get(keys: Keys): Value {
    return deepGet(this._data, keys);
  }
  private _clone(data: Value): Value {
    return this._cloneData ? deepClone(data) : data;
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
    this._checkRule("_read", keys);
    return this._clone(this._get(keys));
  }
  private _set(keys: Keys, value: Value): void {
    this._dataBackup = JSON.stringify(this._data);
    deepSet(this._data, keys, value);

    try {
      this._checkRule("_write", keys);
    } catch (error) {
      this._rollBack();
      throw error;
    }
    this._commit();
  }
  private _commit(): void {
    this._dataBackup = "{}";
    this._notify();
  }
  private _rollBack(): void {
    this._data = JSON.parse(this._dataBackup);
    this._dataBackup = "{}";
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
    const keys = keysFromPath(path);
    if (keys.length === 0) {
      throw new PermissionError("Root path cannot be set");
    }

    let newValue;
    if (typeof valueOrFunction === "function") {
      const oldValue = this.get(pathFromKeys(keys));
      newValue = valueOrFunction(oldValue);
    } else {
      newValue = this._clone(valueOrFunction);
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
    if (isValidNumber(lastKey)) {
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

    const cloned = this._clone(values);
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
   * (value: any, key: string) => any
   * @returns  An array of pairs [key,value] found
   */
  public find(path: string, finder: Finder): [string, Value][] {
    const keys = keysFromPath(path);
    let target = this._get(keys);
    if (!isObject(target)) {
      throw new TypeError("Target not object or array");
    }
    target = this._clone(target);
    const results = [] as [string, Value][];
    for (const key in target) {
      this._checkRule("_read", addChildToKeys(keys, key));
      const value = target[key];
      if (finder(value, key)) {
        results.push([key, value]);
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
      throw new TypeError("Target not object or array");
    }
    target = this._clone(target);
    const keys = keysFromPath(path);
    for (const key in target) {
      this._checkRule("_read", addChildToKeys(keys, key));
      const value = target[key];
      if (finder(value, key)) {
        return [key, value];
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
    returnsRemoved = true,
  ): [string, Value][] {
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
   * (value: any, key: string) => any
   * @returns  A pair [key,value] removed
   */
  public findOneAndRemove(
    path: string,
    finder: Finder,
    returnsRemoved = true,
  ): [string, Value] | void {
    const result = returnsRemoved ? this.findOne(path, finder) : undefined;
    const keys = keysFromPath(path);
    if (result) {
      const pathToRemove = addChildToKeys(keys, result[0]);
      this.remove(pathFromKeys(pathToRemove), returnsRemoved);
    }

    return result;
  }
  // SUBSCRIPTIONS
  /////////////////

  protected _notify() {
    for (const subscription of this._subscriptions) {
      const { path, callback } = subscription;
      const keys = keysFromPath(path);
      this._checkRule("_read", keys);
      const value = deepClone(this._get(keys));
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

  // RULES
  ////////

  private _checkRule(
    ruleType: "_read" | "_write",
    keys: Keys,
  ): void {
    const ruleAndParams = findRuleAndParams(
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
      // deno-lint-ignore no-this-alias
      const self = this;
      let ruleContext;
      if (ruleType === "_write") {
        ruleContext = {
          params,
          get data(): Value {
            return deepGet(JSON.parse(self._dataBackup), rulePath);
          },
          get newData(): Value {
            return deepGet(self._data, rulePath);
          },
          get rootData(): Data {
            return self._clone(self._data);
          },
          set data(_: Value) {
            throw new Error("please do not set data");
          },
          set newData(_: Value) {
            throw new Error("please do not set newData");
          },
          set rootData(_: Data) {
            throw new Error("please do not set rootData");
          },
        };
      }
      if (ruleType === "_read") {
        ruleContext = {
          params,

          get data(): Value {
            return deepGet(self._data, rulePath);
          },
          get newData(): Value {
            return undefined;
          },
          get rootData(): Data {
            return self._clone(self._data);
          },
          set data(_: Value) {
            throw new Error("please do not set data");
          },
          set newData(_: Value) {
            throw new Error("please do not set newData");
          },
          set rootData(_: Data) {
            throw new Error("please do not set rootData");
          },
        };
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
