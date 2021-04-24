import {
  addChildToKeys,
  applyCloneOnGet,
  assertDeepClone,
  deepClone,
  deepGet,
  deepSet,
  findAllRules,
  findDeepestRule,
  isNumberKey,
  isObjectOrArray,
  keysFromPath,
  pathFromKeys,
} from "./helpers.ts";
import { assertEquals } from "../tests/test_deps.ts";

import { equal } from "./deps.ts";
import type {
  BaseConfig,
  Finder,
  Keys,
  KeyValue,
  ObjectOrArray,
  RuleContext,
  Rules,
  Subscriber,
  Subscription,
  Value,
  ValueOrFunction,
} from "./types.ts";
import {
  PermissionError,
  SubscriptionNotFoundError,
  ValidationError,
} from "./Errors.ts";

import { allowAll } from "./rules.ts";

var DEBUG = true;
/**
 * A database in RAM heavily inspired from firebase realtime database.
 *
 */
export class Store {
  /**
   * The actual store cache.
   */
  __data: ObjectOrArray = {};
  __newData: ObjectOrArray = {};

  public getPrivateData({ I_PROMISE_I_WONT_MUTATE_THIS_DATA = false }) {
    return I_PROMISE_I_WONT_MUTATE_THIS_DATA ? this.__data : {};
  }
  protected setData(data: ObjectOrArray) {
    this.__data = (data);
    this.__newData = deepClone(data);
  }
  public getPrivateNewData({ I_PROMISE_I_WONT_MUTATE_THIS_DATA = false }) {
    return I_PROMISE_I_WONT_MUTATE_THIS_DATA ? this.__newData : {};
  }

  /**
   * Create a new Store instance.
   *
   * @param {BaseConfig} config - The configuration
   * @param {Rules} config.rules - it defaults to allowAll
   *
   * */

  constructor(config?: BaseConfig) {
    this._rules = deepClone(config?.rules ?? allowAll);
    this.setData(deepClone(config?.initialDataIfNoFile ?? {}));
  }

  private _get(keys: Keys): Value {
    return deepGet(this.__data, keys);
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
  public get(path: string, getClone = true): Value {
    const keys = keysFromPath(path);
    let data = this._getAndCheck(keys);
    if (getClone) {
      data = deepClone(data);
    }
    return data;
  }

  private _getAndCheck(keys: Keys): Value {
    this._checkPermission("_read", keys);
    return (this._get(keys));
  }

  private _set(keys: Keys, value: Value): void {
    deepSet(this.__newData, keys, deepClone(value));

    try {
      this._checkPermission("_write", keys);
      this._checkValidation(keys, value);
    } catch (error) {
      this._rollBack(keys);
      throw error;
    }
    this._commit(keys, value);
  }
  private _commit(keys: Keys, value: Value): void {
    this._notify();
    deepSet(this.__data, keys, deepClone(value));
    // TODO REMOVE DEBUG:
    if (DEBUG) {
      assertEquals(this.__data, this.__newData);
      assertDeepClone(this.__data, this.__newData);
    }
  }
  private _rollBack(keys: Keys): void {
    const oldData = deepClone(deepGet(this.__data, keys));
    deepSet(this.__newData, keys, oldData);
    // TODO REMOVE DEBUG:
    if (DEBUG) {
      assertEquals(this.__data, this.__newData);
      assertDeepClone(this.__data, this.__newData);
    }
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

    let newValue = valueOrFunction;
    if (typeof valueOrFunction === "function") {
      const oldValue = this._getAndCheck(keys);
      newValue = valueOrFunction(deepClone(oldValue));
    } else {
      newValue = (valueOrFunction);
    }

    this._set(keys, (newValue));

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
    if (!isObjectOrArray(target)) {
      throw new TypeError("Target not object or array");
    }
    target = (target);
    const results = [] as KeyValue[];
    for (const key in target) {
      this._checkPermission("_read", addChildToKeys(keys, key));
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
    if (!isObjectOrArray(target)) {
      throw new TypeError("Target not object or array");
    }
    for (const key in target) {
      this._checkPermission("_read", addChildToKeys(keys, key));
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
  public subscribe(path: string, callback: Subscriber): number {
    const keys = keysFromPath(path);
    this._checkPermission("_read", keys);
    // TODO deepClone needed?
    const id = ++this._subscriptionsLastId;
    this._subscriptions.push({
      callback,
      path,
      id,
    });
    return id;
  }
  private _subscriptionsLastId = 0;

  /**
   * Subscribe to changes in the path
   * It will run the callback if the path value has changed
   * Also runs the callback on the first time
   *
   * @param path The path
   * @param callback A function to be called when the value has changed and during subscription
   * @returns  The value
   */
  public on(path: string, callback: Subscriber): number {
    const id = this.subscribe(path, callback);
    const data = this._getAndCheck(keysFromPath(path));
    const payload = { data: undefined, oldData: undefined };
    applyCloneOnGet(payload, "data", data);
    applyCloneOnGet(payload, "oldData", data);
    callback(payload);
    return id;
  }

  /**
   * Unsubscribe to changes in the path
   *
   * @param path The path
   * @param id the subscription identifier
   */
  public off(path: string, id: number): void {
    const oldLength = this._subscriptions.length;

    this._subscriptions = this._subscriptions.filter(
      (subscription) =>
        !(
          subscription.path === path &&
          subscription.id === id
        ),
    );

    if (oldLength === this._subscriptions.length) {
      throw new SubscriptionNotFoundError("no subscription found");
    }
  }

  protected _notify() {
    for (const subscription of this._subscriptions) {
      const { path, callback, id } = subscription;
      const keys = keysFromPath(path);
      // TODO What to do when a _read rule fails notifying subscriptions
      try {
        this._checkPermission("_read", keys);
      } catch (error) {
        console.warn(
          `Subscription ${id} has not read permission.\n`,
          error.message,
        );
        return;
      }
      const data = deepGet(this.__data, keys);
      const newData = deepGet(this.__newData, keys);
      const payload = { data: undefined, oldData: undefined };

      if (!equal(data, newData)) {
        applyCloneOnGet(payload, "data", newData);
        applyCloneOnGet(payload, "oldData", data);
        try {
          callback(payload);
        } catch (error) {
          // throw error;
          // Do not throw
          console.error(
            `Subscription callback ${id} has thrown.\n`,
            error.message,
          );
        }
      }
    }
  }

  // RULES
  ////////
  protected _rules: Rules;

  private _checkPermission(
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
        ...params,
      };
      applyCloneOnGet(ruleContext, "data", deepGet(this.__data, rulePath));
      applyCloneOnGet(ruleContext, "rootData", this.__data);

      if (ruleType === "_write") {
        applyCloneOnGet(
          ruleContext,
          "newData",
          deepGet(this.__newData, rulePath),
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
  private _checkValidation(keys: Keys, value: Value): void {
    const rootShape = Array.isArray(this.__newData) ? [] : {};
    const diff = deepSet(rootShape, keys, value);
    const validations = findAllRules("_validate", diff, this._rules);
    let currentPath: Keys = [];
    const isValid = validations.every(({ params, rulePath, _validate }) => {
      const ruleContext = {
        ...params,
      };
      applyCloneOnGet(ruleContext, "data", deepGet(this.__data, rulePath));
      applyCloneOnGet(ruleContext, "rootData", this.__data);
      applyCloneOnGet(
        ruleContext,
        "newData",
        deepGet(this.__newData, rulePath),
      );
      currentPath = rulePath;

      return _validate(ruleContext);
    });
    if (!isValid) {
      throw new ValidationError(
        "Validation fails at path " + pathFromKeys(currentPath),
      );
    }
  }
}
