function isObjectOrArray(obj) {
    return obj?.constructor === Object || Array.isArray(obj);
}
function isSet(obj) {
    if (!obj) return;
    if (obj.constructor === Set || obj.constructor === WeakSet) {
        return obj.constructor;
    }
}
function keysFromPath(path) {
    return path.split(/[\\\\/\.]/).filter((key)=>key
    );
}
function pathFromKeys(keys) {
    return `/${keys.join("/")}`;
}
function addChildToKeys(keys, ...rest) {
    return [
        ...keys,
        ...rest
    ];
}
const paramRegex = /^\$.+/;
function getParamFromObject(obj) {
    for(const key in obj){
        if (paramRegex.test(key)) return key;
    }
}
function getParamsFromKeys(keys, keysParams) {
    const params = {
    };
    let i = 0;
    for (const key of keysParams){
        if (paramRegex.test(key)) params[key] = keys[i];
        i++;
    }
    return params;
}
function pathsMatched(object, path) {
    let pathFound = [];
    const allPathsFound = [];
    for(const key in object){
        const [keyEvaluated, ...nextPath] = path;
        const isParam = paramRegex.test(keyEvaluated);
        const desiredKey = isParam ? key : keyEvaluated;
        if (key === desiredKey) {
            pathFound.push(key);
            if (nextPath.length && isObjectOrArray(object[key])) {
                const innerFound = pathsMatched(object[key], nextPath);
                for (const innerPathFound of innerFound){
                    allPathsFound.push([
                        ...pathFound,
                        ...innerPathFound
                    ]);
                }
            } else if (!nextPath.length) {
                allPathsFound.push(pathFound);
            } else {
                allPathsFound.push([
                    ...pathFound,
                    ...nextPath
                ]);
            }
            pathFound = [];
        }
    }
    return allPathsFound;
}
const testCalled = {
    noop: ()=>{
    }
};
const applyCloneOnGet = (obj, key, value)=>{
    let data;
    Object.defineProperty(obj, key, {
        set () {
        },
        get () {
            if (data) {
                return data;
            }
            data = deepClone(value);
            testCalled.noop();
            return data;
        }
    });
    return obj;
};
const assertDeepClone = (a, b)=>{
    if (!isObjectOrArray(a)) {
        if (a !== b) {
            throw new Error(`not clone ${a} ${b}`);
        }
        return;
    } else if (a === b) {
        throw new Error("not clone");
    }
    for(const key in b){
        assertDeepClone(a[key], b[key]);
    }
    for(const key1 in a){
        assertDeepClone(a[key1], b[key1]);
    }
};
const deepMerge = (target, source)=>{
    for(const key in source){
        if (isObjectOrArray(source[key]) && isObjectOrArray(target[key])) {
            Object.assign(source[key], deepMerge(target[key], source[key]));
        }
    }
    Object.assign(target, source);
    return target;
};
const deepClone = (obj)=>{
    const SetConstructor = isSet(obj);
    if (SetConstructor) {
        const clone = new SetConstructor();
        for (const key of obj){
            clone.add(deepClone(key));
        }
        return clone;
    }
    if (!isObjectOrArray(obj)) return obj;
    const initialShape = Array.isArray(obj) ? [] : {
    };
    const clone = Object.assign(initialShape, obj);
    Object.keys(clone);
    for(const key in clone){
        clone[key] = deepClone(obj[key]);
    }
    return clone;
};
const deepGet = (object, keys)=>{
    return keys.reduce((xs, x)=>xs && get(xs, x) !== undefined ? get(xs, x) : undefined
    , object);
};
function isNumberKey(key) {
    const maybeNumber = Number(key);
    return maybeNumber >= 0 && maybeNumber <= Number.MAX_SAFE_INTEGER;
}
function get(maybeObj, key) {
    return maybeObj && maybeObj[key];
}
function set(obj, key, value) {
    Reflect.set(obj, key, value);
}
function del(obj, key) {
    delete obj[key];
}
const deepSet = (obj, keys, value)=>{
    let worker = obj;
    const lastIndex = keys.length - 1;
    let index = -1;
    const removed = [];
    let currentPath = [];
    for (const key of keys){
        if (!key) break;
        if (!worker) break;
        index += 1;
        const _isNumberKey = isNumberKey(key);
        const isArray = Array.isArray(worker);
        if (isArray && !_isNumberKey) {
            throw new TypeError("Target is not Object");
        }
        if (!isArray && _isNumberKey && typeof worker === "object") {
            throw new TypeError("Target is not Array");
        }
        const lastRound = index === lastIndex;
        currentPath = [
            ...currentPath,
            key
        ];
        if (lastRound) {
            removed.push({
                type: "set",
                keys: currentPath,
                value: worker[key]
            });
            if (value === undefined) del(worker, key);
            else set(worker, key, value);
        } else {
            if (!isObjectOrArray(worker[key])) {
                removed.push({
                    type: "set",
                    keys: currentPath,
                    value: worker[key]
                });
                set(worker, key, isNumberKey(keys[index + 1]) ? [] : {
                });
            }
        }
        worker = worker[key];
    }
    return removed;
};
function findRulesOnPath(keys, ruleType, rules) {
    const currentPath = [];
    let worker = rules;
    let index = 0;
    const rulesFound = [];
    const params = {
    };
    do {
        const key = keys[index];
        const child = worker[key];
        const maybeParam = getParamFromObject(worker);
        const maybeRule = worker[ruleType];
        if (typeof maybeRule === "function") {
            const found = {
                params: {
                    ...params
                },
                [ruleType]: maybeRule,
                rulePath: [
                    ...currentPath
                ]
            };
            rulesFound.push(found);
        }
        if (!key) {
            break;
        } else if (isObjectOrArray(child)) {
            worker = child;
        } else if (maybeParam) {
            params[maybeParam] = key;
            worker = worker[maybeParam];
        } else {
            break;
        }
        currentPath.push(key);
        index++;
    }while (index <= keys.length)
    return rulesFound;
}
function findAllRules(ruleType, target, rules, from = [], currentParams = {
}, currentPath = []) {
    const rulesFound = [];
    const params = {
        ...currentParams
    };
    const maybeRule = rules[ruleType];
    const maybeParam = getParamFromObject(rules);
    if (from.length <= currentPath.length && typeof maybeRule === "function") {
        rulesFound.push({
            params: {
                ...currentParams
            },
            rulePath: currentPath,
            [ruleType]: maybeRule
        });
    }
    for(const key in target){
        let rulesChild = rules[key];
        const targetChild = target[key];
        if (maybeParam && !rulesChild) {
            params[maybeParam] = key;
            rulesChild = rules[maybeParam];
        }
        if (rulesChild) {
            rulesFound.push(...findAllRules(ruleType, targetChild, rulesChild, from, params, [
                ...currentPath,
                key, 
            ]));
        }
    }
    return rulesFound;
}
function findRule(ruleType, keys, rules) {
    const params = {
    };
    let index = 0;
    let worker = rules;
    do {
        if (keys.length === index) {
            const maybeRule = worker[ruleType];
            return {
                params,
                [ruleType]: maybeRule,
                rulePath: keys
            };
        }
        const key = keys[index];
        if (worker[key]) {
            worker = worker[key];
        } else {
            const maybeParam = getParamFromObject(worker);
            if (maybeParam) {
                params[maybeParam] = key;
                worker = worker[maybeParam];
            } else {
                break;
            }
        }
        index++;
    }while (index <= keys.length)
    return {
        params,
        [ruleType]: undefined,
        rulePath: keys
    };
}
const debounce = function(fn, delay = 0) {
    let id;
    let lastTime;
    let pending = [];
    async function watcher() {
        if (Date.now() - lastTime > delay) {
            clearInterval(id);
            try {
                id = 0;
                await fn();
                for (const [resolve] of pending){
                    resolve();
                }
            } catch (error) {
                for (const [, reject] of pending){
                    reject(error);
                }
            }
            pending = [];
        }
    }
    function debounced() {
        lastTime = Date.now();
        if (!id) {
            id = setInterval(watcher, delay);
        }
        return new Promise((r, f)=>pending.push([
                r,
                f
            ])
        );
    }
    return debounced;
};
const osType = (()=>{
    if (globalThis.Deno != null) {
        return Deno.build.os;
    }
    const navigator = globalThis.navigator;
    if (navigator?.appVersion?.includes?.("Win") ?? false) {
        return "windows";
    }
    return "linux";
})();
class DenoStdInternalError extends Error {
    constructor(message){
        super(message);
        this.name = "DenoStdInternalError";
    }
}
var EOL;
(function(EOL1) {
    EOL1["LF"] = "\n";
    EOL1["CRLF"] = "\r\n";
})(EOL || (EOL = {
}));
const ANSI_PATTERN = new RegExp([
    "[\\u001B\\u009B][[\\]()#;?]*(?:(?:(?:[a-zA-Z\\d]*(?:;[-a-zA-Z\\d\\/#&.:=?%@~_]*)*)?\\u0007)",
    "(?:(?:\\d{1,4}(?:;\\d{0,4})*)?[\\dA-PR-TZcf-ntqry=><~]))", 
].join("|"), "g");
var DiffType;
(function(DiffType1) {
    DiffType1["removed"] = "removed";
    DiffType1["common"] = "common";
    DiffType1["added"] = "added";
})(DiffType || (DiffType = {
}));
class AssertionError extends Error {
    constructor(message1){
        super(message1);
        this.name = "AssertionError";
    }
}
function isKeyedCollection(x) {
    return [
        Symbol.iterator,
        "size"
    ].every((k)=>k in x
    );
}
function equal(c, d) {
    const seen = new Map();
    return (function compare(a, b) {
        if (a && b && (a instanceof RegExp && b instanceof RegExp || a instanceof URL && b instanceof URL)) {
            return String(a) === String(b);
        }
        if (a instanceof Date && b instanceof Date) {
            const aTime = a.getTime();
            const bTime = b.getTime();
            if (Number.isNaN(aTime) && Number.isNaN(bTime)) {
                return true;
            }
            return a.getTime() === b.getTime();
        }
        if (Object.is(a, b)) {
            return true;
        }
        if (a && typeof a === "object" && b && typeof b === "object") {
            if (seen.get(a) === b) {
                return true;
            }
            if (Object.keys(a || {
            }).length !== Object.keys(b || {
            }).length) {
                return false;
            }
            if (isKeyedCollection(a) && isKeyedCollection(b)) {
                if (a.size !== b.size) {
                    return false;
                }
                let unmatchedEntries = a.size;
                for (const [aKey, aValue] of a.entries()){
                    for (const [bKey, bValue] of b.entries()){
                        if (aKey === aValue && bKey === bValue && compare(aKey, bKey) || compare(aKey, bKey) && compare(aValue, bValue)) {
                            unmatchedEntries--;
                        }
                    }
                }
                return unmatchedEntries === 0;
            }
            const merged = {
                ...a,
                ...b
            };
            for (const key of [
                ...Object.getOwnPropertyNames(merged),
                ...Object.getOwnPropertySymbols(merged), 
            ]){
                if (!compare(a && a[key], b && b[key])) {
                    return false;
                }
            }
            seen.set(a, b);
            return true;
        }
        return false;
    })(c, d);
}
class PermissionError extends Error {
}
class ValidationError extends Error {
}
const allowAll = {
    _read: ()=>true
    ,
    _write: ()=>true
};
class Store {
    #data = {
    };
    #newData = {
    };
    #rules;
    #subscriptions = [];
    #subscriptionsLastId = 0;
    #duringTransaction = false;
    #mutationsToCommit = [];
    #mutationsToRollback = [];
    #mutationDiff = {
    };
    get _dataShape() {
        return Array.isArray(this.#newData) ? [] : {
        };
    }
    get _data() {
        return this.#duringTransaction ? this.#newData : this.#data;
    }
    constructor(config = {
    }){
        if (config.rules) {
            this._assertValidRules(config.rules);
        }
        this.#rules = deepClone(config.rules ?? allowAll);
        this._setData(deepClone(config.initialData ?? {
        }));
    }
    _assertValidRules(rules) {
        const { _transform  } = findRule("_transform", [], rules);
        if (typeof _transform === "function") {
            throw new Error("_transform rule can not be apply at root level");
        }
        const { _as  } = findRule("_as", [], rules);
        if (typeof _as === "function") {
            throw new Error("_as rule can not be apply at root level");
        }
    }
    get(path) {
        const keys = keysFromPath(path);
        this._checkPermission("_read", keys);
        return this._getAs(keys);
    }
    getRef(path) {
        const keys = keysFromPath(path);
        return this._getAndCheck(keys);
    }
    set(path, valueOrFunction) {
        const keys = keysFromPath(path);
        if (keys.length === 0) {
            throw new PermissionError("Root path cannot be set");
        }
        let newValue = valueOrFunction;
        if (typeof valueOrFunction === "function") {
            const oldValue = this._getAndCheck(keys);
            newValue = valueOrFunction(deepClone(oldValue));
        } else {
            newValue = valueOrFunction;
        }
        this._mutate(keys, newValue);
        return this._getAs(keys);
    }
    remove(path, returnRemoved = true) {
        const keys = keysFromPath(path);
        const lastKey = keys[keys.length - 1];
        let oldValue;
        if (returnRemoved) {
            oldValue = this.get(path);
        }
        if (isNumberKey(lastKey)) {
            this._mutate(keys, undefined, "remove");
        } else {
            this._mutate(keys, undefined, "set");
        }
        return oldValue;
    }
    push(path, ...values) {
        const keys = keysFromPath(path);
        const target = this._get(keys);
        if (!Array.isArray(target)) {
            throw new TypeError("Target is not Array");
        }
        const mutationsToRollback = [];
        const mutationsApplied = [];
        const isTransaction = this.#duringTransaction;
        this.beginTransaction();
        try {
            const returned = [];
            const initialLength = target.length;
            for(const index in values){
                const targetIndex = initialLength + Number(index);
                const keysToNewItem = addChildToKeys(keys, String(targetIndex));
                const { removed , applied  } = this._mutate(keysToNewItem, values[index], "add");
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
    find(path, finder) {
        const keys = keysFromPath(path);
        const target = this._get(keys);
        if (!isObjectOrArray(target)) {
            throw new TypeError("Target not Object or Array");
        }
        const results = [];
        for(const key in target){
            const innerKeys = addChildToKeys(keys, key);
            this._checkPermission("_read", innerKeys);
            const value = this._getAs(innerKeys);
            const pair = [
                key,
                value
            ];
            applyCloneOnGet(pair, "1", value);
            if (finder(pair)) {
                results.push(pair);
            }
        }
        return results;
    }
    findOne(path, finder) {
        const keys = keysFromPath(path);
        const target = this._get(keys);
        if (!isObjectOrArray(target)) {
            throw new TypeError("Target not Object or Array");
        }
        for(const key in target){
            const innerKeys = addChildToKeys(keys, key);
            this._checkPermission("_read", innerKeys);
            const value = this._getAs(innerKeys);
            const pair = [
                key,
                value
            ];
            applyCloneOnGet(pair, "1", value);
            if (finder(pair)) {
                return pair;
            }
        }
        return [
            "",
            undefined
        ];
    }
    findAndRemove(path, finder) {
        const results = this.find(path, finder);
        const keys = keysFromPath(path);
        const isTransaction = this.#duringTransaction;
        this.beginTransaction();
        const mutationsToRollback = [];
        const mutationsApplied = [];
        try {
            for(let index = results.length - 1; index >= 0; index--){
                const [lastKey] = results[index];
                const keysToRemove = addChildToKeys(keys, lastKey);
                if (isNumberKey(lastKey)) {
                    const { removed , applied  } = this._mutate(keysToRemove, undefined, "remove");
                    mutationsApplied.push(...applied);
                    mutationsToRollback.push(...removed);
                } else {
                    const { removed , applied  } = this._mutate(keysToRemove, undefined, "set");
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
    findOneAndRemove(path, finder, returnsRemoved = true) {
        const result = this.findOne(path, finder);
        const keys = keysFromPath(path);
        if (result) {
            const keysToRemove = addChildToKeys(keys, result[0]);
            this.remove(pathFromKeys(keysToRemove), returnsRemoved);
        }
        return result;
    }
    observe(path, callback) {
        const keys = keysFromPath(path);
        if (keys.length === 0) {
            throw new Error("Root can not be observed");
        }
        this._checkPermission("_read", keys);
        const id = ++this.#subscriptionsLastId;
        this.#subscriptions.push({
            callback,
            path: keys,
            id
        });
        return id;
    }
    off(id) {
        const oldLength = this.#subscriptions.length;
        this.#subscriptions = this.#subscriptions.filter((subscription)=>subscription.id !== id
        );
        if (oldLength === this.#subscriptions.length) {
            return false;
        }
        return true;
    }
    getPrivateData({ I_PROMISE_I_WONT_MUTATE_THIS_DATA =false  }) {
        return I_PROMISE_I_WONT_MUTATE_THIS_DATA ? this.#data : {
        };
    }
    getPrivateNewData({ I_PROMISE_I_WONT_MUTATE_THIS_DATA =false  }) {
        return I_PROMISE_I_WONT_MUTATE_THIS_DATA ? this.#newData : {
        };
    }
    beginTransaction() {
        this.#duringTransaction = true;
        return this;
    }
    commit() {
        this.#duringTransaction = false;
        this._commit(this.#mutationsToCommit);
        this.#mutationsToRollback = [];
        this.#mutationsToCommit = [];
    }
    rollback() {
        this.#duringTransaction = false;
        this._rollback(this.#mutationsToRollback, this.#mutationsToCommit);
        this.#mutationsToRollback = [];
        this.#mutationsToCommit = [];
    }
    _setData(data) {
        this.#data = data;
        this.#newData = deepClone(data);
    }
    _createRuleArgs(params = {
    }, rulePath, targetData = this.#newData) {
        const newData = deepGet(targetData, rulePath);
        const oldData = deepGet(this.#data, rulePath);
        const data = newData;
        const context = {
            _oldData: oldData,
            _newData: newData,
            _rootData: this._data,
            newData: undefined,
            oldData: undefined,
            rootData: {
            },
            ...params
        };
        applyCloneOnGet(context, "oldData", oldData);
        applyCloneOnGet(context, "rootData", this._data);
        applyCloneOnGet(context, "newData", newData);
        return [
            data,
            context
        ];
    }
    _createSubscriptionPayload(params, keys) {
        const oldData = this._getAsFrom(this.#data, keys);
        const newData = this._getAsFrom(this.#newData, keys);
        const payload = {
            ...params,
            _oldData: oldData,
            _newData: newData,
            isUpdated: oldData !== undefined && newData !== undefined,
            isCreated: oldData === undefined,
            isDeleted: newData === undefined
        };
        applyCloneOnGet(payload, "newData", newData);
        applyCloneOnGet(payload, "oldData", oldData);
        return payload;
    }
    _checkPermission(ruleType, keys) {
        const rulesFound = findRulesOnPath(keys, ruleType, this.#rules);
        if (rulesFound.length === 0) {
            throw new PermissionError(`Not explicit permission to ${ruleType.replace("_", "")}`);
        }
        let path = [];
        for (const ruleFound of rulesFound){
            const rule = ruleFound[ruleType];
            const params = ruleFound.params;
            const rulePath = ruleFound.rulePath;
            const ruleArgs = this._createRuleArgs(params, rulePath);
            const allowed = rule(...ruleArgs);
            if (allowed) return;
            else path = rulePath;
        }
        throw new PermissionError(`${ruleType.replace("_", "")} disallowed at path ${pathFromKeys(path)}`);
    }
    _checkValidation(diff) {
        const ruleType = "_validate";
        const validations = findAllRules(ruleType, diff, this.#rules);
        let currentPath = [];
        const isValid = validations.every(({ params , rulePath , _validate  })=>{
            const ruleArgs = this._createRuleArgs(params, rulePath);
            currentPath = rulePath;
            return _validate(...ruleArgs);
        });
        if (!isValid) {
            throw new ValidationError("Validation fails at path " + pathFromKeys(currentPath));
        }
    }
    _findMutations(ruleType, diff, from = []) {
        const mutations = findAllRules(ruleType, diff, this.#rules, from);
        mutations.reverse();
        const mutationsToApply = [];
        for (const { [ruleType]: rule , rulePath , params  } of mutations){
            mutationsToApply.push({
                keys: rulePath,
                value: rule,
                type: "set",
                params
            });
        }
        return mutationsToApply;
    }
    _get(keys) {
        return deepGet(this._data, keys);
    }
    _getAndCheck(keys) {
        this._checkPermission("_read", keys);
        return this._get(keys);
    }
    _getAs(keys) {
        return this._getAsFrom(this._data, keys);
    }
    _getAsFrom(target, keys) {
        let value;
        if (target === this.#data) {
            value = deepClone(deepGet(target, keys));
        } else {
            value = deepGet(target, keys);
        }
        const diff = {
            root: this._dataShape
        };
        const path = [
            "root",
            ...keys
        ];
        deepSet(diff, path, value);
        const mutationsToApply = this._findMutations("_as", diff.root, keys);
        this._applyMutations(diff.root, mutationsToApply, [], false);
        const r = deepGet(diff, path);
        return r;
    }
    _applyMutations(target, mutations, removed, cloneValue = false) {
        for (const mutation of mutations){
            const { keys , value , type , params  } = mutation;
            let newValue = value;
            if (typeof value === "function") {
                const args = this._createRuleArgs(params, keys, target);
                newValue = value(...args);
                mutation.value = newValue;
            }
            if (cloneValue) {
                newValue = deepClone(newValue);
            }
            if (type === "set") {
                removed.push(...deepSet(target, keys, newValue));
            } else {
                const parentKeys = keys.filter((_, index)=>index !== keys.length - 1
                );
                const lastKey = keys[keys.length - 1];
                const parent = deepGet(target, parentKeys);
                if (type === "remove") {
                    const [valueRemoved] = parent.splice(Number(lastKey), 1);
                    removed.push({
                        type: "add",
                        value: valueRemoved,
                        keys
                    });
                }
                if (type === "add") {
                    parent.splice(Number(lastKey), 0, newValue);
                    removed.push({
                        type: "remove",
                        keys,
                        value: undefined
                    });
                }
            }
        }
    }
    _mutate(keys, value, type = "set") {
        const removed = [];
        let mutationsToApply = [];
        try {
            const diff = this._dataShape;
            deepSet(diff, keys, value ?? null);
            this._applyMutations(this.#newData, [
                {
                    keys,
                    value,
                    type: type === "remove" ? "set" : type
                }
            ], removed);
            this._checkPermission("_write", keys);
            mutationsToApply = this._findMutations("_transform", diff);
            this._applyMutations(this.#newData, mutationsToApply, removed);
            this._checkValidation(diff);
            deepMerge(this.#mutationDiff, diff);
            const currentMutation = {
                keys,
                value,
                type
            };
            mutationsToApply.unshift(currentMutation);
            if (!this.#duringTransaction) {
                this._commit(mutationsToApply);
            }
            if (type === "remove") {
                this._applyMutations(this.#newData, [
                    currentMutation
                ], removed);
            }
            if (this.#duringTransaction) {
                this.#mutationsToCommit.push(...mutationsToApply);
                this.#mutationsToRollback.push(...removed);
            }
        } catch (error) {
            this._rollback(removed, mutationsToApply);
            throw error;
        }
        return {
            applied: mutationsToApply,
            removed
        };
    }
    _commit(toCommit) {
        this._notify();
        const removed = [];
        try {
            this._applyMutations(this.#data, toCommit, removed, true);
            this.#mutationDiff = this._dataShape;
        } catch (error) {
            this._rollback(removed, toCommit);
            throw error;
        }
    }
    _rollback(toRollback, applied) {
        const removed = [];
        this._applyMutations(this.#newData, toRollback.reverse(), removed);
        this.#mutationsToCommit = this.#mutationsToCommit.filter((saved)=>applied.every((applied)=>saved !== applied
            )
        );
    }
    _notify() {
        if (Object.keys(this.#mutationDiff).length === 0) return;
        for (const subscription of this.#subscriptions){
            const { path , callback , id  } = subscription;
            const paths = pathsMatched(this.#mutationDiff, path);
            for (const keys of paths){
                const params = getParamsFromKeys(keys, path);
                try {
                    this._checkPermission("_read", keys);
                } catch (error) {
                    console.warn(`Subscription ${id} has not read permission.\n`, error.message);
                    return;
                }
                const oldData = deepGet(this.#data, keys);
                const newData = deepGet(this.#newData, keys);
                if (!equal(oldData, newData)) {
                    const payload = this._createSubscriptionPayload(params, keys);
                    try {
                        callback(payload);
                    } catch (error) {
                        console.error(`Subscription callback ${id} has thrown.\n`, error.message);
                    }
                }
            }
        }
    }
}
class StorePersistance extends Store {
    #storePath;
    #autoSave = false;
    #writeLazyDelay;
    writeLazy;
    constructor(config1){
        super(config1);
        this.#autoSave = config1?.autoSave ?? false;
        this.#writeLazyDelay = config1?.writeLazyDelay ?? 0;
        const name = config1?.name || ".store.db";
        this.#storePath = [
            config1?.folder,
            name
        ].filter(Boolean).join("/");
        this.load();
        this.writeLazy = debounce(()=>this.write()
        , this.#writeLazyDelay);
    }
    get storePath() {
        return this.#storePath;
    }
    _commit(toCommit) {
        const returned = super._commit(toCommit);
        if (this.#autoSave) {
            this.writeLazy().catch((error)=>{
                console.error(error);
            });
        }
        return returned;
    }
}
class StoreSessionStorage1 extends StorePersistance {
    load() {
        const data = sessionStorage.getItem(this.storePath);
        if (!data) return;
        const decoded = JSON.parse(data);
        this._setData(decoded);
        return;
    }
    write() {
        const data = JSON.stringify(this.getPrivateData({
            I_PROMISE_I_WONT_MUTATE_THIS_DATA: true
        }));
        sessionStorage.setItem(this.storePath, data);
    }
    deleteStore() {
        sessionStorage.clear();
    }
}
export { StoreSessionStorage1 as StoreSessionStorage };
