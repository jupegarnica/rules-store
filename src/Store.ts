import {
  addChildToKeys,
  applyCloneOnGet,
  deepClone,
  deepGet,
  deepMerge,
  deepSet,
  findAllRules,
  findDeepestRule,
  findRule,
  getParamsFromKeys,
  isNumberKey,
  isObjectOrArray,
  keysFromPath,
  pathFromKeys,
  pathsMatched,
} from "./helpers.ts";

import { equal } from "./deps.ts";
import type {
  BaseConfig,
  Finder,
  Keys,
  KeyValue,
  ObjectOrArray,
  Observer,
  ObserverPayload,
  Params,
  RuleContext,
  Rules,
  Subscription,
  Transformation,
  Value,
  ValueOrFunction,
} from "./types.ts";
import { PermissionError, ValidationError } from "./Errors.ts";

import { allowAll } from "./rulesTemplates.ts";

// assertDeepClone,
// const { assertDeepClone } = await import("./helpers.ts");
// const { assertEquals } = await import("../tests/test_deps.ts");
/**
 * A database in RAM heavily inspired from firebase realtime database.
 *
 */
export class Store {
  /**
   * The store state.
   */
  #data: ObjectOrArray = {};
  #newData: ObjectOrArray = {};
  #rules: Rules;
  #subscriptions: Subscription[] = [];
  #subscriptionsLastId = 0;
  #duringTransaction = false;
  #transformationsToCommit: Transformation[] = [];
  #transformationsToRollback: Transformation[] = [];
  #mutationDiff: ObjectOrArray = {};

  get _dataShape() {
    return Array.isArray(this.#newData) ? [] : {};
  }

  get _data() {
    return this.#duringTransaction ? this.#newData : this.#data;
  }
  /**
   * Create a new Store instance.
   *
   * @param {BaseConfig} config - The configuration
   * @param {Rules} config.rules - it defaults to allowAll
   *
   * */

  constructor(config: BaseConfig = {}) {
    if (config.rules) {
      this._assertValidRules(config.rules);
    }
    this.#rules = deepClone(config.rules ?? allowAll);
    this._setData(deepClone(config.initialData ?? {}));
  }
  private _assertValidRules(rules: Rules): void | never {
    const { _transform } = findRule("_transform", [], rules);
    if (typeof _transform === "function") {
      throw new Error("_transform rule can not be apply at root level");
    }
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
  public get(
    path: string,
    {
      UNSAFELY_DO_NOT_GET_CLONED_DATA_TO_IMPROVE_PERFORMANCE: notClone = false,
    } = {},
  ): Value {
    const keys = keysFromPath(path);
    this._checkPermission("_read", keys);
    let data = this._getAs(keys);
    if (!notClone) {
      data = deepClone(data);
    }
    return data;
  }

  public getRef(
    path: string,
  ): Value {
    const keys = keysFromPath(path);
    this._checkPermission("_read", keys);
    return this._get(keys);
  }

  /**
   * Sets a value in the database by the specified path.
   * It throw exception if not permission to write or validation fails,
   *
   * @param path  The path can be an string delimited by . / or \
   * As:
   * 'a.b.c'
   * '/a/b/c' same as 'a/b/c'  or 'a/b/c/'
   * '\\a\\b\\c'  escaped \
   *
   * @param valueOrFunction The new value or a function to run with the oldValue
   * @returns  The value added, maybe transformed by _transform and/or _as
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

    this._set(keys, newValue);
    return this._getAs(keys);
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
      oldValue = this.get(path);
    }
    if (isNumberKey(lastKey)) {
      // remove array child
      const isTransaction = this.#duringTransaction;
      // this.beginTransaction();
      this._set(keys, undefined);
      const parentKeys = keys.filter((_: Value, index: number) =>
        (index) !== keys.length - 1
      );
      this._removeItem(parentKeys, lastKey);
      if (!isTransaction) this.commit();
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
    const target = this._get(keys);
    if (!Array.isArray(target)) {
      throw new TypeError("Target is not Array");
    }
    const isTransaction = this.#duringTransaction;
    this.beginTransaction();
    try {
      const returned = [] as Value[];
      const initialLength = target.length;
      for (const index in values) {
        const targetIndex = initialLength + Number(index);
        const keysToNewItem = addChildToKeys(keys, String(targetIndex));
        this._set(keysToNewItem, values[index]);
        returned.push(this._getAs(keysToNewItem));
      }
      if (!isTransaction) this.commit();
      return returned.length > 1 ? returned : returned[0];
    } catch (error) {
      if (isTransaction) {
        this._rollback(
          this.#transformationsToRollback,
        );
      } else {
        this.rollback();
      }
      throw error;
    }
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
    const target = this._get(keys);
    if (!isObjectOrArray(target)) {
      throw new TypeError("Target not Object or Array");
    }
    const results = [] as KeyValue[];
    for (const key in target) {
      const innerKeys = addChildToKeys(keys, key);
      this._checkPermission("_read", innerKeys);
      const value = this._getAs(innerKeys);
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

    const target = this._get(keys);
    if (!isObjectOrArray(target)) {
      throw new TypeError("Target not Object or Array");
    }
    for (const key in target) {
      const innerKeys = addChildToKeys(keys, key);
      this._checkPermission("_read", innerKeys);
      const value = this._getAs(innerKeys);
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
    const isTransaction = this.#duringTransaction;
    this.beginTransaction();

    for (let index = results.length - 1; index >= 0; index--) {
      const [key] = results[index];
      const keysToRemove = addChildToKeys(keys, key);
      this.remove(pathFromKeys(keysToRemove), returnsRemoved);
    }
    if (!isTransaction) this.commit();

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

  /**
   * Subscribe to changes in the path
   * It will run the callback only if the path value has changed
   *
   * @param path The path
   * @param callback A function to be called when the value has changed and during subscription
   * @returns  The value
   */
  public observe(path: string, callback: Observer): number {
    const keys = keysFromPath(path);
    if (keys.length === 0) {
      throw new Error("Root can not be observed");
    }
    this._checkPermission("_read", keys);
    const id = ++this.#subscriptionsLastId;
    this.#subscriptions.push({
      callback,
      path: keys,
      id,
    });
    return id;
  }

  /**
   * Unobserve to changes in the path
   *
   * @param path The path
   * @param id the subscription identifier
   */
  public off(id: number): boolean {
    const oldLength = this.#subscriptions.length;

    this.#subscriptions = this.#subscriptions.filter(
      (subscription) => subscription.id !== id,
    );

    if (oldLength === this.#subscriptions.length) {
      return false;
    }
    return true;
  }
  public getPrivateData({ I_PROMISE_I_WONT_MUTATE_THIS_DATA = false }) {
    return I_PROMISE_I_WONT_MUTATE_THIS_DATA ? this.#data : {};
  }

  public getPrivateNewData({ I_PROMISE_I_WONT_MUTATE_THIS_DATA = false }) {
    return I_PROMISE_I_WONT_MUTATE_THIS_DATA ? this.#newData : {};
  }
  public beginTransaction(): Store {
    this.#duringTransaction = true;
    return this;
  }
  public commit() {
    this.#duringTransaction = false;
    this._commit(
      this.#transformationsToCommit,
    );
    this.#transformationsToRollback = [];
    this.#transformationsToCommit = [];
  }

  public rollback() {
    this.#duringTransaction = false;
    this._rollback(
      this.#transformationsToRollback,
    );
    this.#transformationsToRollback = [];
    this.#transformationsToCommit = [];
  }

  protected _setData(data: ObjectOrArray) {
    this.#data = (data);
    this.#newData = deepClone(data);
  }

  private _createRuleContext(
    params: Params,
    rulePath: Keys,
    ruleType: string,
  ): RuleContext {
    const _newData = deepGet(this.#newData, rulePath);
    let _data = deepGet(this.#data, rulePath);

    // if (ruleType === "_as" || ruleType === "_read") {
    //   _data = _newData;
    // } else {
    // }

    const context = {
      ...params,
      _data,
      _newData,
      _rootData: this._data,
    };
    applyCloneOnGet(context, "data", _data);
    applyCloneOnGet(context, "rootData", this._data);
    applyCloneOnGet(
      context,
      "newData",
      _newData,
    );
    return context as RuleContext;
  }
  private _createSubscriptionPayload(
    params: Params,
    keys: Keys,
  ): ObserverPayload {
    debugger;
    const oldData = (deepGet(this.#data, keys));
    const newData = (deepGet(this.#newData, keys));
    const payload = {
      ...params,
      isUpdated: oldData !== undefined && newData !== undefined,
      isCreated: oldData === undefined,
      isDeleted: newData === undefined,
    };
    applyCloneOnGet(payload, "newData", newData);
    applyCloneOnGet(payload, "oldData", oldData);
    return payload as ObserverPayload;
  }
  private _checkPermission(
    ruleType: "_read" | "_write",
    keys: Keys,
  ): void {
    const ruleAndParams = findDeepestRule(
      keys,
      ruleType,
      this.#rules,
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
      const ruleContext = this._createRuleContext(
        params,
        rulePath,
        ruleType,
      ) as RuleContext;

      const allowed = rule && rule(ruleContext);

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
  private _checkValidation(diff: ObjectOrArray): void {
    const ruleType = "_validate";
    const validations = findAllRules(ruleType, diff, this.#rules);
    let currentPath: Keys = [];
    const isValid = validations.every(({ params, rulePath, _validate }) => {
      const ruleContext = this._createRuleContext(params, rulePath, ruleType);
      currentPath = rulePath;

      return _validate(ruleContext);
    });
    if (!isValid) {
      throw new ValidationError(
        "Validation fails at path " + pathFromKeys(currentPath),
      );
    }
  }
  private _findTransformations(
    ruleType: string,
    diff: ObjectOrArray,
    from: Keys = [],
  ): Transformation[] {
    const transforms = findAllRules(ruleType, diff, this.#rules, from);
    transforms.reverse();
    const transformationsToApply = [] as Transformation[];
    for (const { [ruleType]: rule, rulePath, params } of transforms) {
      const transformContext = this._createRuleContext(
        params,
        rulePath,
        ruleType,
      );
      transformationsToApply.push({
        keys: rulePath,
        value: rule,
        type: "set",
        transformContext: transformContext as RuleContext,
      });
    }

    return transformationsToApply;
  }
  private _get(keys: Keys): Value {
    return deepGet(this._data, keys);
  }
  private _getAndCheck(keys: Keys): Value {
    this._checkPermission("_read", keys);
    return (this._get(keys));
  }
  private _getAs(keys: Keys): Value {
    return this._getAsFrom(this._data, keys);
  }

  // private _getAsFrom(target: ObjectOrArray, keys: Keys): Value {
  //   let data;
  //   const maybeFound = findRule("_as", keys, this.#rules);
  //   if (typeof maybeFound._as === "function") {
  //     data = maybeFound._as(
  //       this._createRuleContext(maybeFound.params, keys, target),
  //     );
  //   } else {
  //     data = deepGet(target, keys);
  //   }
  //   return data;
  // }

  private _getAsFrom(target: ObjectOrArray, keys: Keys): Value {
    const value = deepClone(deepGet(target, keys));
    // console.log("\n", { value });

    const diff = { root: this._dataShape };
    const path = ["root", ...keys];
    deepSet(diff, path, value);

    const transformationsToApply = this._findTransformations(
      "_as",
      diff.root,
      keys,
    );

    this._applyTransformations(
      diff.root,
      transformationsToApply,
      [], // do not have rollback
      false,
    );
    // console.log("\n", { root: diff.root });

    const r = deepGet(diff, path);
    // console.log("\n", { r });
    // console.log("\n--------");

    return r;
  }

  private _applyTransformations(
    target: ObjectOrArray,
    transformations: Transformation[],
    removed: Transformation[],
    cloneValue = false,
  ): void {
    for (
      const transformation of transformations
    ) {
      const { keys, value, transformContext, type, index } = transformation;
      if (type === "set") {
        let newValue = value;
        if (transformContext && typeof value === "function") {
          newValue = value(transformContext);
          transformation.value = newValue; // do not run transformation again committing to #data
        }
        if (cloneValue) {
          newValue = deepClone(newValue);
        }
        removed.push(...deepSet(target, keys, newValue));
      } else if (type === "remove") {
        const parent = deepGet(target, keys);
        const [valueRemoved] = parent.splice(Number(index), 1);
        removed.push({ type: "add", value: valueRemoved, keys, index });
      } else if (type === "add") {
        const parent = deepGet(target, keys);
        parent.splice(Number(index), 0, value);
        removed.push({ type: "remove", keys, index });
      }
    }
  }

  protected _set(
    keys: Keys,
    value: Value,
  ): void {
    const removed: Transformation[] = [];

    try {
      // create write diff
      const diff = this._dataShape;
      deepSet(diff, keys, value ?? null);

      // apply write
      this._applyTransformations(
        this.#newData,
        [{ keys, value, type: "set" }],
        removed,
      );
      this._checkPermission("_write", keys);

      // apply _transform rule
      const transformationsToApply = this._findTransformations(
        "_transform",
        diff,
      );

      this._applyTransformations(
        this.#newData,
        transformationsToApply,
        removed,
      );

      this._checkValidation(diff);
      deepMerge(this.#mutationDiff, diff);

      if (this.#duringTransaction) {
        this.#transformationsToCommit.push(
          { keys, value: deepClone(value), type: "set" },
          ...transformationsToApply,
        );
        this.#transformationsToRollback.push(...removed);
        return;
      }

      this._commit([
        { keys, value: deepClone(value), type: "set" },
        ...transformationsToApply,
      ]);
    } catch (error) {
      this._rollback(removed);
      throw error;
    }
  }

  protected _commit(
    toCommit: Transformation[],
  ): void {
    this._notify();
    const removed = [] as Transformation[];
    try {
      this._applyTransformations(this._data, toCommit, removed, true);
      this.#mutationDiff = this._dataShape;
    } catch (error) {
      this._rollback(removed);
      throw error;
    }
    // assertEquals(this._data, this.#newData);
    // assertDeepClone(this._data, this.#newData);
  }
  private _rollback(transformations: Transformation[]): void {
    const removed = [] as Transformation[];
    this._applyTransformations(
      this.#newData,
      transformations.reverse(),
      removed,
    );
    // assertEquals(this._data, this.#newData);
    // assertDeepClone(this._data, this.#newData);
  }

  private _notify() {
    if (Object.keys(this.#mutationDiff).length === 0) return;
    for (const subscription of this.#subscriptions) {
      const { path, callback, id } = subscription;
      const paths = pathsMatched(this.#mutationDiff, path);

      for (const keys of paths) {
        const params = getParamsFromKeys(keys, path);

        try {
          this._checkPermission("_read", keys);
        } catch (error) {
          // TODO What to do when a observer has no _read Permission
          console.warn(
            `Subscription ${id} has not read permission.\n`,
            error.message,
          );
          // throw error;
          return;
        }
        const oldData = deepGet(this.#data, keys);
        const newData = deepGet(this.#newData, keys);
        if (!equal(oldData, newData)) {
          const payload = this._createSubscriptionPayload(
            params,
            keys,
          );
          try {
            callback(payload);
          } catch (error) {
            // TODO What to do when a subscription fails running callback?
            // Do not throw
            console.error(
              `Subscription callback ${id} has thrown.\n`,
              error.message,
            );
            // throw error;
          }
        }
      }
    }
  }
  private _removeItem(targetKeys: Keys, keyToRemove: string) {
    const removed = [] as Transformation[];
    const transformation: Transformation = {
      keys: targetKeys,
      index: keyToRemove,
      type: "remove",
    };

    this._applyTransformations(
      this.#newData,
      [transformation],
      removed,
    );
    this.#transformationsToCommit.push(
      transformation,
    );
    this.#transformationsToRollback.push(...removed);
  }
}
