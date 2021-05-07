import {
  addChildToKeys,
  applyCloneOnGet,
  deepClone,
  deepGet,
  deepMerge,
  deepSet,
  findAllRules,
  findRule,
  findRulesOnPath,
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
  Mapper,
  Mutation,
  MutationType,
  Notification,
  ObjectOrArray,
  Observer,
  ObserverContext,
  Params,
  RuleArgs,
  RuleContext,
  Rules,
  Subscription,
  Value,
  ValueOrFunction,
} from "./types.ts";
import { PermissionError, ValidationError } from "./Errors.ts";

import { allowAll } from "./rulesTemplates.ts";

// const assertClone = false;
// if (assertClone) {
//   var { assertDeepClone } = await import("./helpers.ts");
// }

/**
 * A data Store heavily inspired from firebase realtime database.
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
  #mutationsToCommit: Mutation[] = [];
  #mutationsToRollback: Mutation[] = [];
  #mutationDiff: ObjectOrArray = {};
  #enabledRules = {
    _read: true,
    _write: true,
    _readAs: true,
    _writeAs: true,
    _transform: true,
    _validate: true,
  };

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
    if (config.skipRules) {
      for (const rule of config.skipRules) {
        this.#enabledRules[rule] = false;
      }
    }
    this.#rules = deepClone(config.rules ?? allowAll);
    this._setData(deepClone(config.initialData ?? {}));
  }
  private _assertValidRules(rules: Rules): void | never {
    const { _transform } = findRule("_transform", [], rules);
    if (typeof _transform === "function") {
      throw new Error("_transform rule can not be apply at root level");
    }
    const { _readAs } = findRule("_readAs", [], rules);
    if (typeof _readAs === "function") {
      throw new Error("_readAs rule can not be apply at root level");
    }
    const { _writeAs } = findRule("_writeAs", [], rules);
    if (typeof _writeAs === "function") {
      throw new Error("_writeAs rule can not be apply at root level");
    }
  }

  /**
   * Retrieves a value from database by specified path.
   *
   * @param path The path can be an string delimited by /
   * As:
   * '/a/b/c' same as 'a/b/c'  or 'a/b/c/'
   * @returns The cloned value found or undefined if not found
   */
  public get(
    path: string,
  ): Value {
    const keys = keysFromPath(path);
    this._checkPermission("_read", keys);
    return this._getAs(keys);
  }

  public getRef(
    path: string,
  ): Value {
    const keys = keysFromPath(path);
    return this._getAndCheck(keys);
  }

  /**
   * Sets a value in the database by the specified path.
   * It throw exception if not permission to write or validation fails,
   *
   * @param path  The path can be an string delimited by . / or \
   * As:
   * '/a/b/c' same as 'a/b/c'  or 'a/b/c/'
   *
   * @param valueOrFunction The new value or a function to run with the oldValue
   * @returns  The value added, maybe transformed by _transform and/or _readAs
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

    this._mutate(keys, newValue);
    return this._getAs(keys);
  }

  /**
   * Remove a value in the database by the specified path.
   * If pointing to an array item, the item will be remove, as array.splice(index,1)
   *
   * @param path The path
   * @param returnRemoved whether or not it will return the value removed. Useful to skip read rules.  Defaults to true
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
      this._mutate(keys, undefined, "remove");
    } else {
      // remove object key
      this._mutate(keys, undefined, "set");
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
    const mutationsToRollback = [] as Mutation[];
    const mutationsApplied = [] as Mutation[];
    const isTransaction = this.#duringTransaction;
    this.beginTransaction();
    try {
      const returned = [] as Value[];
      const initialLength = target.length;
      for (const index in values) {
        const targetIndex = initialLength + Number(index);
        const keysToNewItem = addChildToKeys(keys, String(targetIndex));
        const { removed, applied } = this._mutate(
          keysToNewItem,
          values[index],
          "add",
        );
        mutationsApplied.push(...applied);
        mutationsToRollback.push(...removed);
        returned.push(this._getAs(keysToNewItem));
      }
      if (!isTransaction) this.commit();
      return returned.length > 1 ? returned : returned[0];
    } catch (error) {
      if (!isTransaction) this.rollback();
      else this._rollback(mutationsToRollback, mutationsApplied);

      throw error;
    }
  }

  /**
   * Find some children
   *
   * @param path The path to the target to perform the search
   * @param finder The finder should return a truthy value in order to return that node
   * ([key,value]) => any
   * @returns  An array of pairs [key,value] found
   */
  public find(path: string, finder: Finder): KeyValue[] {
    const keys = keysFromPath(path);
    const target = this._get(keys);
    if (!isObjectOrArray(target)) {
      throw new TypeError("Target not Object or Array");
    }
    this._checkPermission("_read", keys);
    const results = [] as KeyValue[];
    for (const key in target) {
      const innerKeys = addChildToKeys(keys, key);
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
   * @param finder The finder should return a truthy value in order to return that node
   * ([key,value]) => any
   * @returns  A pair [key,value] found. If not found will return a empty key: ['', undefined]
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
   * Find some children and remove them
   *
   * @param {string}  path The path to the target to perform the search
   * @param {Function} finder The finder should return a truthy value in order to remove that node
   * ([key,value]) => any
   * @returns  An array of pairs [key,value] removed
   */
  public findAndRemove(
    path: string,
    finder: Finder,
  ): KeyValue[] {
    const results = this.find(path, finder);
    const keys = keysFromPath(path);
    const isTransaction = this.#duringTransaction;
    this.beginTransaction();
    const mutationsToRollback = [] as Mutation[];
    const mutationsApplied = [] as Mutation[];
    try {
      for (let index = results.length - 1; index >= 0; index--) {
        const [lastKey] = results[index];
        const keysToRemove = addChildToKeys(keys, lastKey);
        if (isNumberKey(lastKey)) {
          // remove array child
          const { removed, applied } = this._mutate(
            keysToRemove,
            undefined,
            "remove",
          );
          mutationsApplied.push(...applied);
          mutationsToRollback.push(...removed);
        } else {
          // remove object key
          const { removed, applied } = this._mutate(
            keysToRemove,
            undefined,
            "set",
          );
          mutationsApplied.push(...applied);
          mutationsToRollback.push(...removed);
        }
      }
      if (!isTransaction) this.commit();
    } catch (error) {
      if (!isTransaction) this.rollback();
      else this._rollback(mutationsToRollback, mutationsApplied);
      throw error;
    }

    return results;
  }

  /**
   * Find some children and update them
   *
   * @param {string}  path The path to the target to perform the search
   * @param {Finder} finder The finder should return a truthy value in order to remove that node
   * ([key,value]) => any
   * @param {Mapper} mapper The mapper receives a [key,value] and returns the new value transformed
   * @returns  An array of pairs [key,value] updated
   */

  public findAndUpdate(
    path: string,
    finder: Finder,
    mapper: Mapper,
  ): KeyValue[] {
    const results = this.find(path, finder);
    const keys = keysFromPath(path);
    const isTransaction = this.#duringTransaction;
    this.beginTransaction();
    const mutationsToRollback = [] as Mutation[];
    const mutationsApplied = [] as Mutation[];
    const returned = [] as KeyValue[];

    try {
      for (const [key, value] of results) {
        const targetPath = addChildToKeys(keys, key);
        const newValue = mapper([key, value]);
        const { removed, applied } = this._mutate(
          targetPath,
          newValue,
          "set",
        );
        returned.push([key, newValue]);
        mutationsApplied.push(...applied);
        mutationsToRollback.push(...removed);
      }
      if (!isTransaction) this.commit();
    } catch (error) {
      if (!isTransaction) this.rollback();
      else this._rollback(mutationsToRollback, mutationsApplied);
      throw error;
    }

    return returned;
  }

  /**
   * Find one child and update it
   *
   * @param path The path to the target to perform the search
   * @param finderThe finder should return a truthy value in order to remove that node
   * ([key,value]) => any
   * @param {Mapper} mapper The mapper receives a [key,value] and returns the new value transformed
   * @returns  A pair [key,value] updated
   */
  public findOneAndUpdate(
    path: string,
    finder: Finder,
    mapper: Mapper,
  ): KeyValue | void {
    const [key, value] = this.findOne(path, finder);
    const keys = keysFromPath(path);
    let newValue: Value;
    if (key) {
      const targetPath = addChildToKeys(keys, key);
      newValue = mapper([key, value]);
      this._mutate(
        targetPath,
        newValue,
        "set",
      );
    }

    return [key, newValue];
  }
  /**
   * Find one child and remove it
   *
   * @param path The path to the target to perform the search
   * @param finderThe finder should return a truthy value in order to remove that node
   * ([key,value]) => any
   * @returns  A pair [key,value] removed
   */
  public findOneAndRemove(
    path: string,
    finder: Finder,
  ): KeyValue | void {
    const result = this.findOne(path, finder);
    const keys = keysFromPath(path);
    if (result) {
      const keysToRemove = addChildToKeys(keys, result[0]);
      this.remove(pathFromKeys(keysToRemove));
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
   * @param {number} id the subscription identifier
   * @return {boolean} returns true if the subscription has been removed, or false if the subscription id hasn't been found
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
      this.#mutationsToCommit,
    );
    this.#mutationsToRollback = [];
    this.#mutationsToCommit = [];

    // if (assertClone) {
    //   assertDeepClone(this._data, this.#newData);
    // }
  }

  public rollback() {
    this.#duringTransaction = false;
    this._rollback(
      this.#mutationsToRollback,
      this.#mutationsToCommit,
    );
    this.#mutationsToRollback = [];
    this.#mutationsToCommit = [];
  }

  protected _setData(data: ObjectOrArray) {
    this.#data = (data);
    this.#newData = deepClone(data);
  }

  private _createRuleArgs(
    params: Params = {},
    rulePath: Keys,
    targetData = this.#newData,
  ): RuleArgs {
    const newData = deepGet(targetData, rulePath);
    const oldData = deepGet(this.#data, rulePath);
    const data = newData;

    const context: RuleContext = {
      _oldData: oldData,
      _newData: newData,
      _rootData: this._data,
      newData: undefined,
      oldData: undefined,
      rootData: {},
      isUpdate: oldData !== undefined && newData !== undefined,
      isCreation: oldData === undefined,
      isRemove: newData === undefined,
      ...params,
    };
    applyCloneOnGet(context, "oldData", oldData);
    applyCloneOnGet(context, "rootData", this._data);
    applyCloneOnGet(context, "newData", newData);
    return [data, context] as RuleArgs;
  }
  private _createObserverArgs(
    params: Params,
    keys: Keys,
  ): [Value, ObserverContext] {
    const oldData = (this._getAsFrom(this.#data, keys));
    const newData = (this._getAsFrom(this.#newData, keys));
    const payload = {
      ...params,
      oldData: oldData,
      newData: newData,
      isUpdate: oldData !== undefined && newData !== undefined,
      isCreation: oldData === undefined,
      isRemove: newData === undefined,
    } as ObserverContext;
    applyCloneOnGet(payload, "newData", newData);
    applyCloneOnGet(payload, "oldData", oldData);
    return [newData, payload];
  }
  private _checkPermission(
    ruleType: "_read" | "_write",
    keys: Keys,
  ): void {
    const rulesFound = findRulesOnPath(
      keys,
      ruleType,
      this.#rules,
    );
    if (rulesFound.length === 0) {
      throw new PermissionError(
        `Not explicit permission to ${
          ruleType.replace(
            "_",
            "",
          )
        }`,
      );
    }
    let path: Keys = [];
    for (const ruleFound of rulesFound) {
      const rule = ruleFound[ruleType];
      const params = ruleFound.params;
      const rulePath = ruleFound.rulePath;
      const ruleArgs = this._createRuleArgs(
        params,
        rulePath,
      );

      const allowed = rule(...ruleArgs);

      if (allowed) return;
      else path = rulePath;
    }
    throw new PermissionError(
      `${
        ruleType.replace(
          "_",
          "",
        )
      } disallowed at path ${pathFromKeys(path)}`,
    );
  }
  private _checkValidation(diff: ObjectOrArray): void {
    const ruleType = "_validate";
    const validations = findAllRules(ruleType, diff, this.#rules);
    let currentPath: Keys = [];
    const isValid = validations.every(({ params, rulePath, _validate }) => {
      const ruleArgs = this._createRuleArgs(params, rulePath);
      currentPath = rulePath;

      return _validate(...ruleArgs);
    });
    if (!isValid) {
      throw new ValidationError(
        "Validation fails at path " + pathFromKeys(currentPath),
      );
    }
  }
  private _findMutations(
    ruleType: string,
    diff: ObjectOrArray,
    from: Keys = [],
  ): Mutation[] {
    const mutations = findAllRules(ruleType, diff, this.#rules, from);
    mutations.reverse();
    const mutationsToApply = [] as Mutation[];
    for (const { [ruleType]: rule, rulePath, params } of mutations) {
      mutationsToApply.push({
        keys: rulePath,
        value: rule,
        type: "set",
        params,
      });
    }

    return mutationsToApply;
  }
  private _get(keys: Keys): Value {
    return deepGet(this._data, keys);
  }
  private _getAndCheck(keys: Keys): Value {
    if (this.#enabledRules["_read"]) {
      this._checkPermission("_read", keys);
    }
    return (this._get(keys));
  }
  private _getAs(keys: Keys): Value {
    return this._getAsFrom(this._data, keys);
  }

  // private _getAsFrom(target: ObjectOrArray, keys: Keys): Value {
  //   let data;
  //   const maybeFound = findRule("_readAs", keys, this.#rules);
  //   if (typeof maybeFound._readAs === "function") {
  //     data = maybeFound._readAs(
  //       this._createRuleArgs(maybeFound.params, keys, target),
  //     );
  //   } else {
  //     data = deepGet(target, keys);
  //   }
  //   return data;
  // }

  private _getAsFrom(target: ObjectOrArray, keys: Keys): Value {
    let value;
    if (target === this.#data) {
      value = deepClone(deepGet(target, keys));
    } else {
      value = (deepGet(target, keys));
    }
    if (!this.#enabledRules["_readAs"]) {
      return value;
    }

    const diff = { root: this._dataShape };
    const path = ["root", ...keys];
    deepSet(diff, path, value);

    const mutationsToApply = this._findMutations(
      "_readAs",
      diff.root,
      keys,
    );

    this._applyMutations(
      diff.root,
      mutationsToApply,
      [], // do not have rollback
      false,
    );

    return deepGet(diff, path);
  }

  private _applyMutations(
    target: ObjectOrArray,
    mutations: Mutation[],
    removed: Mutation[],
    cloneValue = false,
  ): void {
    for (
      const mutation of mutations
    ) {
      const { keys, value, type, params } = mutation;
      let newValue = value;
      if (typeof value === "function") {
        const args = this._createRuleArgs(
          params,
          keys,
          target,
        );
        newValue = value(...args);
        mutation.value = newValue; // do not run mutation again committing to #data
      }
      if (cloneValue) {
        newValue = deepClone(newValue);
      }

      if (type === "set") {
        removed.push(...deepSet(target, keys, newValue));
      } else {
        const parentKeys = keys.filter((_: Value, index: number) =>
          (index) !== keys.length - 1
        );
        const lastKey = keys[keys.length - 1];
        const parent = deepGet(target, parentKeys);

        if (type === "remove") {
          const [valueRemoved] = parent.splice(Number(lastKey), 1);
          removed.push({
            type: "add",
            value: valueRemoved,
            keys,
          });
        }
        if (type === "add") {
          parent.splice(Number(lastKey), 0, newValue);
          removed.push({ type: "remove", keys, value: undefined });
        }
      }
    }
  }

  protected _mutate(
    keys: Keys,
    newValue: Value,
    type: MutationType = "set",
  ): { applied: Mutation[]; removed: Mutation[] } {
    const removed: Mutation[] = [];
    const mutationsToApply: Mutation[] = [];

    try {
      // create write diff
      const diff = this._dataShape;
      deepSet(diff, keys, (newValue ?? null));
      const value = deepClone(newValue);
      if (this.#enabledRules["_write"]) {
        // apply write
        this._applyMutations(
          this.#newData,
          [{
            keys,
            value,
            type: type === "remove" ? "set" : type,
          }],
          removed,
        );

        this._checkPermission("_write", keys);
      }
      if (this.#enabledRules["_transform"]) {
        // apply _transform rule
        const transformMutations = this._findMutations(
          "_transform",
          diff,
          keys,
        );
        mutationsToApply.push(...transformMutations);
        this._applyMutations(
          this.#newData,
          transformMutations,
          removed,
        );
      }
      if (this.#enabledRules["_validate"]) {
        this._checkValidation(diff);
      }

      if (this.#enabledRules["_writeAs"]) {
        // apply _writeAs rule
        const writeAsMutations = this._findMutations(
          "_writeAs",
          diff,
          keys,
        );
        mutationsToApply.push(...writeAsMutations);
        this._applyMutations(
          this.#newData,
          writeAsMutations,
          removed,
        );
      }

      deepMerge(this.#mutationDiff, diff);

      const currentMutation = { keys, value, type };
      mutationsToApply.unshift(currentMutation);

      if (!this.#duringTransaction) {
        this._commit(mutationsToApply);
      }
      if (type === "remove") {
        this._applyMutations(
          this.#newData,
          [currentMutation],
          removed,
        );
      }
      if (this.#duringTransaction) {
        this.#mutationsToCommit.push(...mutationsToApply);
        this.#mutationsToRollback.push(...removed);
      }
    } catch (error) {
      this._rollback(removed, mutationsToApply);
      throw error;
      // } finally {
      //   if (assertClone && !this.#duringTransaction) {
      //     assertDeepClone(this._data, this.#newData);
      // }
    }

    return { applied: mutationsToApply, removed };
  }

  protected _commit(
    toCommit: Mutation[],
  ): void {
    const notifications = this._findNotifications();
    const removed = [] as Mutation[];
    try {
      this._applyMutations(this.#data, toCommit, removed, true);
      this.#mutationDiff = this._dataShape;
      this._notify(notifications);
    } catch (error) {
      this._rollback(removed, toCommit, this.#data);
      throw error;
    }
  }
  private _rollback(
    toRollback: Mutation[],
    applied: Mutation[],
    target = this.#newData,
  ): void {
    const removed = [] as Mutation[];
    this._applyMutations(
      target,
      toRollback.reverse(),
      removed,
    );
    this.#mutationsToCommit = this.#mutationsToCommit.filter((saved) =>
      applied.every((applied) => saved !== applied)
    );
    // if (!this.#duringTransaction && assertClone) {
    //   // // console.log(this._data, this.#newData);

    //   assertDeepClone(this._data, this.#newData);
    // }
  }
  private _notify(notifications: Notification[]): void {
    for (const { callback, args, id } of notifications) {
      try {
        callback(...args);
      } catch (error) {
        // TODO What to do when a subscription fails running callback?
        console.error(
          `Subscription callback ${id} has thrown.\n`,
          error.message,
        );
        throw error;
      }
    }
  }

  private _findNotifications(): Notification[] {
    const notifications = [] as Notification[];
    if (Object.keys(this.#mutationDiff).length === 0) return notifications;
    for (const subscription of this.#subscriptions) {
      const { path, callback, id } = subscription;
      const paths = pathsMatched(this.#mutationDiff, path);
      for (const keys of paths) {
        try {
          this._checkPermission("_read", keys);
        } catch (error) {
          // TODO What to do when a observer has no _read Permission
          console.warn(
            `Subscription ${id} has not read permission.\n`,
            error.message,
          );
          // throw error;
          continue;
        }
        const oldData = deepGet(this.#data, keys);
        const newData = deepGet(this.#newData, keys);
        if (!equal(oldData, newData)) {
          const params = getParamsFromKeys(keys, path);
          const args = this._createObserverArgs(
            params,
            keys,
          );
          notifications.push({ callback, args, id });
        }
      }
    }
    return notifications;
  }
  // private _removeItem(targetKeys: Keys, keyToRemove: string) {
  //   const removed = [] as Mutation[];
  //   const mutation: Mutation = {
  //     keys: targetKeys,
  //     index: keyToRemove,
  //     type: "remove",
  //     value: undefined,
  //   };

  //   this._applyMutations(
  //     this.#newData,
  //     [mutation],
  //     removed,
  //   );
  //   this.#mutationsToCommit.push(
  //     mutation,
  //   );
  //   this.#mutationsToRollback.push(...removed);
  // }
  // private _addItem(targetKeys: Keys, keyToAdd: string, value:Value) {
  //   const removed = [] as Mutation[];
  //   const mutation: Mutation = {
  //     keys: targetKeys,
  //     index: keyToAdd,
  //     type: "add",
  //     value
  //   };

  //   this._applyMutations(
  //     this.#newData,
  //     [mutation],
  //     removed,
  //   );
  //   this.#mutationsToCommit.push(
  //     mutation,
  //   );
  //   this.#mutationsToRollback.push(...removed);
  // }
}
