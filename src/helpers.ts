import type {
  Callable,
  Data,
  Keys,
  ObjectKind,
  Params,
  Rule,
  RuleFound,
  Rules,
  Value,
} from "./types.ts";

export function isObjectOrArray(obj: unknown): boolean {
  return typeof obj === "object" && obj !== null;
}
// match "\" "/" o "."
export function keysFromPath(path: string): Keys {
  return path.split(/[\\\\/\.]/).filter((key) => key);
}

export function pathFromKeys(keys: Keys): string {
  return `/${keys.join("/")}`;
}

export function addChildToKeys(keys: Keys, ...rest: Keys): Keys {
  return [...keys, ...rest];
}

const paramRegex = /^\$.+/;

export function findParam(obj: ObjectKind): string | void {
  for (const key in obj) {
    if (key.match(paramRegex)) return key;
  }
}

export const testCalled: { noop: () => void } = {
  noop: () => {},
};

export const applyCloneOnGet = (obj: ObjectKind, key: string, value: Value) => {
  let data: Value;

  Object.defineProperty(obj, key, {
    set() {
      // Reflect.set(obj, key, val);
      throw new Error("context must be inmutable");
    },
    get() {
      if (data) {
        return data;
      }
      data = deepClone(value);
      testCalled.noop();
      return data;
    },
  });
  return obj;
};

export const deepClone = (obj: Value) => {
  if (!isObjectOrArray(obj)) return obj;
  const initialShape = Array.isArray(obj) ? [] : {};
  const clone = Object.assign(initialShape, obj);
  Object.keys(clone).forEach(
    (
      key,
    ) => (clone[key] = isObjectOrArray(obj[key])
      ? deepClone(obj[key])
      : obj[key]),
  );
  return clone;
};
// export const deepClone = (obj: Value) => {
//   if (!isObjectOrArray(obj)) {
//     return obj;
//   }
//   return JSON.parse(JSON.stringify(obj));
// };

export const deepGet = (object: ObjectKind, keys: Keys): Value => {
  return keys.reduce(
    (xs, x) => (xs && get(xs, x) !== undefined ? get(xs, x) : undefined),
    object,
  );
};

export function isNumberKey(key: string): boolean {
  const maybeNumber = Number(key);
  return maybeNumber <= Number.MAX_SAFE_INTEGER;
}

// export function isNumberKey(key: string): boolean {
//   const maybeNumber = Number(key);
//   return (
//     maybeNumber >= Number.MIN_SAFE_INTEGER &&
//     maybeNumber <= Number.MAX_SAFE_INTEGER
//   );
// }
// function get(obj: Value, key: string) {
//   // return obj[key];
//   if (obj && !Array.isArray(obj)) return obj[key];

//   let n = Number(key);
//   if (n < 0) n += obj.length;
//   if (n < 0 || n >= obj.length) return undefined;
//   return obj[n];
// }
// function setToObject(
//   obj: Data,
//   key: string | symbol,
//   value: Value,
// ): void {
//   Reflect.set(obj, key, value);
// }

// function setToArray(arr: Data, key: string, value: Value): void {
//   // let n = Number(key);
//   // if (n < 0) n += arr.length;
//   // if (n < 0) throw new TypeError("Invalid index: " + n);
//   // Reflect.set(arr, (n), value);
//   Reflect.set(arr, key, value);
// }

function get(
  maybeObj: Value,
  key: string | symbol,
): Value {
  return maybeObj && maybeObj[key];
}

function set(
  obj: ObjectKind,
  key: string | symbol,
  value: Value,
): void {
  Reflect.set(obj, key, value);
}
function del(obj: ObjectKind, key: string): void {
  delete obj[key];
}
export const deepSet = (
  obj: ObjectKind,
  keys: Keys,
  value: Value,
): Value => {
  let worker = obj;
  const lastIndex = keys.length - 1;
  let index = -1;
  for (const key of keys) {
    if (!key) break;
    if (!worker) break;
    index++;
    const _isNumberKey = isNumberKey(key);
    const isArray = Array.isArray(worker);
    // const isObject = !isArray && worker && typeof worker === "object";

    if (isArray && !_isNumberKey) {
      throw new TypeError("target is not Array");
    }
    if (!isArray && _isNumberKey) {
      throw new TypeError("target is not Object");
    }

    // const set = (isArray ? setToArray : setToObject);
    const lastRound = index === lastIndex;

    if (lastRound) {
      if (value === undefined) del(worker, key);
      else set(worker, key, value);
    } else {
      if (!isObjectOrArray(worker[key])) {
        set(worker, key, isNumberKey(keys[index + 1]) ? [] : {});
      }
    }

    worker = worker[key];
  }

  return obj;
};

export function findDeepestRule(
  keys: Keys,
  ruleType: string,
  rules: Rules,
): RuleFound {
  const params: Params = {};
  const currentPath = [] as Keys;
  let rulePath = [] as Keys;
  // deno-lint-ignore no-explicit-any
  let worker = rules as any;
  // deno-lint-ignore no-explicit-any
  let rule: Rule | any;
  let index = 0;

  do {
    const key = keys[index];
    const child = worker[key];
    const maybeParam = findParam(worker);
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
      rulePath = [...currentPath];
    }
    index++;
  } while (index < keys.length);

  const result = { params, [ruleType]: rule, rulePath };
  return result;
}

export function findAllRules(
  ruleType: string,
  target: ObjectKind,
  rules: Rules,
  currentParams: Params = {},
  currentPath: Keys = [],
): RuleFound[] {
  const rulesFound = [] as RuleFound[];
  const params = { ...currentParams } as Params;
  const maybeRule = rules[ruleType];
  const maybeParam = findParam(rules);
  if (typeof maybeRule === "function") {
    rulesFound.push({
      params: { ...currentParams },
      rulePath: currentPath,
      [ruleType]: maybeRule,
    });
  }
  for (const key in target) {
    let rulesChild = rules[key] as Value;
    const targetChild = target[key];

    if (maybeParam && !rulesChild) {
      params[maybeParam] = key;
      rulesChild = rules[maybeParam];
    }
    if (rulesChild) {
      rulesFound.push(
        ...findAllRules(ruleType, targetChild, rulesChild, params, [
          ...currentPath,
          key,
        ]),
      );
    }
  }
  return rulesFound;
}

// // deno-lint-ignore no-explicit-any
// export const debounce = (fn: (...a: any[]) => any, ms = 0, self: any) => {
//   let timeoutId: number;
//   // deno-lint-ignore no-explicit-any
//   return function (...args: any[]) {
//     clearTimeout(timeoutId);
//     timeoutId = setTimeout(() => fn.apply(self, args), ms);
//   };
// };

// deno-lint-ignore no-explicit-any
export const debounce = (fn: Callable, ms = 0, self: any) => {
  let timeoutId: number;
  const pending: {
    resolve: Callable;
    reject: Callable;
  }[] = [];
  // deno-lint-ignore no-explicit-any
  return (...args: any[]): Promise<void> =>
    new Promise((res, rej) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        const currentPending = [...pending];
        pending.length = 0;
        Promise.resolve(fn.apply(self, args)).then(
          (data) => {
            currentPending.forEach(({ resolve }) => resolve(data));
          },
          (error) => {
            currentPending.forEach(({ reject }) => reject(error));
          },
        );
      }, ms);
      pending.push({ resolve: res, reject: rej });
    });
};

// export const debounce = (fn: Callable, ms = 0, self: any) => {
//   let timeoutId: number;
//   const pending:any[] = [];
//   // deno-lint-ignore no-explicit-any
//   return (...args: any[]): Promise<void> =>
//   {
//       // Run the function after a certain amount of time
//       clearTimeout(timeoutId);
//       timeoutId = setTimeout(() => {
//         // Get the result of the inner function, then apply it to the resolve function of
//         // each promise that has been created since the last time the inner function was run
//         for (const _ of pending) {
//           fn.apply(self, args)
//         }

//         pending.length = 0;
//       }, ms);

//       return new Promise(r => pending.push(r));
//   };
// };

// export function memo(fun: (...args: Value[]) => Value) {
//   const cache: { [key: string]: Value } = {};
//   return function (...args: Value[]) {
//     const key = args[0];
//     if (cache[key] != undefined) {
//       return cache[key];
//     } else {
//       const result = fun(...args);
//       cache[key] = result;
//       return result;
//     }
//   };
// }

// export function memoCheckRule(fun: (...args: Value[]) => Value) {
//   const cache: { [key: string]: Value } = {};
//   return function (...args: Value[]) {
//     const key = args[0] + args[1];
//     if (cache[key] != undefined) {
//       return cache[key];
//     } else {
//       const result = fun(...args);
//       cache[key] = result;
//       return result;
//     }
//   };
// }

// type AnyObject = { [key: string ]: any };
// const makeHandler = (path: Keys) => {
//   return {
//     set(target: AnyObject, key: string, value: any, receiver: AnyObject) {
//       throw new Error("Inmutable data");

//       // if (typeof value === "object") {
//       //   value = deepProxy(value, [...path, key]);
//       // }
//       // target[key] = value;

//       // // if (dp._handler.set) {
//       // //   dp._handler.set(target, [...path, key], value, receiver);
//       // // }
//       // return true;
//     },

//     deleteProperty(target: AnyObject, key: string) {
//       throw new Error("Inmutable data");

//       // if (Reflect.has(target, key)) {
//       //   let deleted = Reflect.deleteProperty(target, key);
//       //   return deleted;
//       // }
//       // return false;
//     },
//   };
// };
// export const deepProxy = (obj: Value, path: Keys = []) => {
//   if (!isObjectOrArray(obj)) return obj;

//   for (const key in obj) {
//     Reflect.set(obj, key, deepProxy(obj[key], [...path, key]));
//   }

//   // const root = { root: obj };
//   const proxy = (new Proxy(obj, makeHandler(path))) as Value;
//   return proxy;
// };
