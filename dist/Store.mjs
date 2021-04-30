function isObjectOrArray(obj) {
    return typeof obj === "object" && obj !== null && !(obj instanceof Date);
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
    }
    if (a === b) {
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
function findDeepestRule(keys, ruleType, rules) {
    const params = {
    };
    const currentPath = [];
    let rulePath = [];
    let worker = rules;
    let rule;
    let index = 0;
    do {
        const key = keys[index];
        const child = worker[key];
        const maybeParam = getParamFromObject(worker);
        let maybeRule = worker[ruleType];
        if (maybeRule) rule = maybeRule;
        if (isObjectOrArray(child)) {
            worker = child;
        } else {
            if (maybeParam) {
                params[maybeParam] = key;
                worker = worker[maybeParam];
            } else {
                break;
            }
        }
        currentPath.push(key);
        maybeRule = worker[ruleType];
        if (maybeRule) {
            rule = maybeRule;
            rulePath = [
                ...currentPath
            ];
        }
        index++;
    }while (index < keys.length)
    const result = {
        params,
        [ruleType]: rule,
        rulePath
    };
    return result;
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
function findAllRules(ruleType, target, rules, currentParams = {
}, currentPath = []) {
    const rulesFound = [];
    const params = {
        ...currentParams
    };
    const maybeRule = rules[ruleType];
    const maybeParam = getParamFromObject(rules);
    if (typeof maybeRule === "function") {
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
            rulesFound.push(...findAllRules(ruleType, targetChild, rulesChild, params, [
                ...currentPath,
                key, 
            ]));
        }
    }
    return rulesFound;
}
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
class Store1 {
    #data = {
    };
    #newData = {
    };
    #rules;
    #subscriptions = [];
    #subscriptionsLastId = 0;
    #duringTransaction = false;
    #transformationsToCommit = [];
    #transformationsToRollback = [];
    #mutationDiff = {
    };
    get _dataShape() {
        return Array.isArray(this.#newData) ? [] : {
        };
    }
    get _data() {
        return this.#duringTransaction ? this.#newData : this.#data;
    }
    constructor(config){
        this.#rules = deepClone(config?.rules ?? allowAll);
        this._setData(deepClone(config?.initialData ?? {
        }));
    }
    get(path, { UNSAFELY_DO_NOT_GET_CLONED_DATA_TO_IMPROVE_PERFORMANCE: notClone = false ,  } = {
    }) {
        const keys = keysFromPath(path);
        this._checkPermission("_read", keys);
        let data = this._getAs(keys);
        if (!notClone) {
            data = deepClone(data);
        }
        return data;
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
        this._set(keys, newValue);
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
            const isTransaction = this.#duringTransaction;
            this._set(keys, undefined);
            const parentKeys = keys.filter((_, index)=>index !== keys.length - 1
            );
            this._removeItem(parentKeys, lastKey);
            if (!isTransaction) this.commit();
        } else {
            this._set(keys, undefined);
        }
        return oldValue;
    }
    push(path, ...values) {
        const keys = keysFromPath(path);
        const target = this._get(keys);
        if (!Array.isArray(target)) {
            throw new TypeError("Target is not Array");
        }
        const isTransaction = this.#duringTransaction;
        this.beginTransaction();
        try {
            const returned = [];
            const initialLength = target.length;
            for(const index in values){
                const targetIndex = initialLength + Number(index);
                const keysToNewItem = addChildToKeys(keys, String(targetIndex));
                this._set(keysToNewItem, values[index]);
                returned.push(this._getAs(keysToNewItem));
            }
            if (!isTransaction) this.commit();
            return returned.length > 1 ? returned : returned[0];
        } catch (error) {
            if (isTransaction) {
                this._rollback(this.#transformationsToRollback);
            } else {
                this.rollback();
            }
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
    findAndRemove(path, finder, returnsRemoved = true) {
        const results = returnsRemoved ? this.find(path, finder) : [];
        const keys = keysFromPath(path);
        const isTransaction = this.#duringTransaction;
        this.beginTransaction();
        for(let index = results.length - 1; index >= 0; index--){
            const [key] = results[index];
            const keysToRemove = addChildToKeys(keys, key);
            this.remove(pathFromKeys(keysToRemove), returnsRemoved);
        }
        if (!isTransaction) this.commit();
        return results;
    }
    findOneAndRemove(path, finder, returnsRemoved = true) {
        const result = returnsRemoved ? this.findOne(path, finder) : undefined;
        const keys = keysFromPath(path);
        if (result) {
            const keysToRemove = addChildToKeys(keys, result[0]);
            this.remove(pathFromKeys(keysToRemove), returnsRemoved);
        }
        return result;
    }
    subscribe(path, callback) {
        const keys = keysFromPath(path);
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
        this._commit(this.#transformationsToCommit);
        this.#transformationsToRollback = [];
        this.#transformationsToCommit = [];
    }
    rollback() {
        this.#duringTransaction = false;
        this._rollback(this.#transformationsToRollback);
        this.#transformationsToRollback = [];
        this.#transformationsToCommit = [];
    }
    _setData(data) {
        this.#data = data;
        this.#newData = deepClone(data);
    }
    _createRuleContext(params, rulePath, rootData = this.#data) {
        const _data = deepGet(rootData, rulePath);
        const _newData = deepGet(this.#newData, rulePath);
        const context = {
            ...params,
            _data,
            _newData,
            _rootData: this._data
        };
        applyCloneOnGet(context, "data", _data);
        applyCloneOnGet(context, "rootData", this._data);
        applyCloneOnGet(context, "newData", _newData);
        return context;
    }
    _createSubscriptionPayload(params, keys) {
        const oldData = this._getAsFrom(this.#data, keys);
        const newData = this._getAsFrom(this.#newData, keys);
        const payload = params;
        applyCloneOnGet(payload, "newData", newData);
        applyCloneOnGet(payload, "oldData", oldData);
        return payload;
    }
    _checkPermission(ruleType, keys) {
        const ruleAndParams = findDeepestRule(keys, ruleType, this.#rules);
        const rule = ruleAndParams[ruleType];
        const params = ruleAndParams.params;
        const rulePath = ruleAndParams.rulePath;
        try {
            if (typeof rule !== "function") {
                throw new PermissionError(`Not explicit permission to ${ruleType.replace("_", "")}`);
            }
            const ruleContext = this._createRuleContext(params, rulePath);
            const allowed = rule && rule(ruleContext);
            if (!allowed) {
                throw new PermissionError(`${ruleType.replace("_", "")} disallowed at path ${pathFromKeys(rulePath)}`);
            }
            return;
        } catch (error) {
            throw error;
        }
    }
    _checkValidation(diff) {
        const validations = findAllRules("_validate", diff, this.#rules);
        let currentPath = [];
        const isValid = validations.every(({ params , rulePath , _validate  })=>{
            const ruleContext = this._createRuleContext(params, rulePath);
            currentPath = rulePath;
            return _validate(ruleContext);
        });
        if (!isValid) {
            throw new ValidationError("Validation fails at path " + pathFromKeys(currentPath));
        }
    }
    _findTransformations(diff) {
        const transforms = findAllRules("_transform", diff, this.#rules);
        transforms.reverse();
        const transformationsToApply = [];
        for (const { _transform , rulePath , params  } of transforms){
            const transformContext = this._createRuleContext(params, rulePath);
            transformationsToApply.push({
                keys: rulePath,
                value: _transform,
                type: "set",
                transformContext: transformContext
            });
        }
        return transformationsToApply;
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
        let data;
        const maybeFound = findRule("_as", keys, this.#rules);
        if (typeof maybeFound._as === "function") {
            data = maybeFound._as(this._createRuleContext(maybeFound.params, keys, target));
        } else {
            data = deepGet(target, keys);
        }
        return data;
    }
    _applyTransformations(target, transformations, removed, cloneValue = false) {
        for (const transformation of transformations){
            const { keys , value , transformContext , type , index  } = transformation;
            if (type === "set") {
                let newValue = value;
                if (transformContext && typeof value === "function") {
                    newValue = value(transformContext);
                    transformation.value = newValue;
                }
                if (cloneValue) {
                    newValue = deepClone(newValue);
                }
                removed.push(...deepSet(target, keys, newValue));
            } else if (type === "remove") {
                const parent = deepGet(target, keys);
                const [valueRemoved] = parent.splice(Number(index), 1);
                removed.push({
                    type: "add",
                    value: valueRemoved,
                    keys,
                    index
                });
            } else if (type === "add") {
                const parent = deepGet(target, keys);
                parent.splice(Number(index), 0, value);
                removed.push({
                    type: "remove",
                    keys,
                    index
                });
            }
        }
    }
    _set(keys, value) {
        const removed = [];
        try {
            const diff = this._dataShape;
            deepSet(diff, keys, value ?? null);
            this._applyTransformations(this.#newData, [
                {
                    keys,
                    value,
                    type: "set"
                }
            ], removed);
            this._checkPermission("_write", keys);
            const transformationsToApply = this._findTransformations(diff);
            this._applyTransformations(this.#newData, transformationsToApply, removed);
            this._checkValidation(diff);
            deepMerge(this.#mutationDiff, diff);
            if (this.#duringTransaction) {
                this.#transformationsToCommit.push({
                    keys,
                    value: deepClone(value),
                    type: "set"
                }, ...transformationsToApply);
                this.#transformationsToRollback.push(...removed);
                return;
            }
            this._commit([
                {
                    keys,
                    value: deepClone(value),
                    type: "set"
                },
                ...transformationsToApply, 
            ]);
        } catch (error) {
            this._rollback(removed);
            throw error;
        }
    }
    _commit(toCommit) {
        this._notify();
        const removed = [];
        try {
            this._applyTransformations(this._data, toCommit, removed, true);
            this.#mutationDiff = this._dataShape;
        } catch (error) {
            this._rollback(removed);
            throw error;
        }
    }
    _rollback(transformations) {
        const removed = [];
        this._applyTransformations(this.#newData, transformations.reverse(), removed);
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
    _removeItem(targetKeys, keyToRemove) {
        const removed = [];
        const transformation = {
            keys: targetKeys,
            index: keyToRemove,
            type: "remove"
        };
        this._applyTransformations(this.#newData, [
            transformation
        ], removed);
        this.#transformationsToCommit.push(transformation);
        this.#transformationsToRollback.push(...removed);
    }
}
export { Store1 as Store };
