import type {
  Callable,
  Keys,
  Mutation,
  ObjectOrArray,
  Params,
  Rule,
  RuleFound,
  Rules,
  Value,
} from "./types.ts";
// import debounce from "https://dev.jspm.io/lodash.debounce";
// export { debounce };

export function isObjectOrArray(obj: unknown): boolean {
  return typeof obj === "object" && obj !== null && !(obj instanceof Date);
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

export function getParamFromObject(obj: ObjectOrArray): string | void {
  for (const key in obj) {
    if (paramRegex.test(key)) return key;
  }
}

export function getParamsFromKeys(keys: Keys, keysParams: Keys): Params {
  const params = {} as Params;
  let i = 0;
  for (const key of keysParams) {
    if (paramRegex.test(key)) params[key] = keys[i];
    i++;
  }
  return params;
}

export function pathsMatched(
  object: ObjectOrArray,
  path: Keys,
): Keys[] {
  let pathFound: Keys = [];
  const allPathsFound: Keys[] = [];
  for (const key in object) {
    const [keyEvaluated, ...nextPath] = path;

    const isParam = paramRegex.test(keyEvaluated);
    const desiredKey = isParam ? key : keyEvaluated;
    if (key === desiredKey) {
      pathFound.push(key);
      if (nextPath.length && isObjectOrArray(object[key])) {
        const innerFound = pathsMatched(object[key], nextPath);
        for (const innerPathFound of innerFound) {
          allPathsFound.push([...pathFound, ...innerPathFound]);
        }
      } else if (!nextPath.length) {
        allPathsFound.push(pathFound);
      } else {
        allPathsFound.push([...pathFound, ...nextPath]);
      }
      pathFound = [];
    }
  }
  return allPathsFound;
}

export const testCalled: { noop: () => void } = {
  noop: () => {},
};

export const applyCloneOnGet = (
  obj: ObjectOrArray,
  key: string,
  value: Value,
) => {
  let data: Value;
  Object.defineProperty(obj, key, {
    set() {
      // // Reflect.set(obj, key, val);
      // throw new Error("context must be inmutable");
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

export const assertDeepClone = (a: Value, b: Value): void => {
  if (!isObjectOrArray(a)) {
    if (a !== b) {
      throw new Error(`not clone ${a} ${b}`);
    }
    return;
  } else if (a === b) {
    throw new Error("not clone");
  }

  for (const key in b) {
    assertDeepClone(a[key], b[key]);
  }
  for (const key in a) {
    assertDeepClone(a[key], b[key]);
  }
};

export const deepMerge = (
  target: ObjectOrArray,
  source: ObjectOrArray,
): ObjectOrArray => {
  for (const key in source) {
    if (isObjectOrArray(source[key]) && isObjectOrArray(target[key])) {
      Object.assign(source[key], deepMerge(target[key], source[key]));
    }
  }
  // TODO Needed?
  // const shape = Array.isArray(source) ? [] : {};
  // Object.assign(target ?? shape, source);
  Object.assign(target, source);
  return target;
};

// export const deepMerge = (target, source) => {
//   // Iterate through `source` properties and if an `Object` set property to merge of `target` and `source` properties
//   for (const key of Object.keys(source)) {
//     if (source[key] instanceof Object) {
//       Object.assign(source[key], deepMerge(target[key], source[key]));
//     }
//   }

//   // Join `target` and modified `source`
//   Object.assign(target || {}, source);
//   return target;
// };

export const deepClone = (obj: Value) => {
  if (!isObjectOrArray(obj)) return obj;

  if ((obj) instanceof Set) {
    const clone = new Set();
    for (const key of obj) {
      clone.add(deepClone(key));
    }
    return clone;
  }

  const initialShape = Array.isArray(obj) ? [] : {};
  const clone = Object.assign(initialShape, obj);
  Object.keys(clone);
  for (const key in clone) {
    clone[key] = deepClone(obj[key]);
  }
  return clone;
};
// export const deepClone = (obj: Value) => {
//   if (!isObjectOrArray(obj)) {
//     return obj;
//   }
//   return JSON.parse(JSON.stringify(obj));
// };

export const deepGet = (object: ObjectOrArray, keys: Keys): Value => {
  return keys.reduce(
    (xs, x) => (xs && get(xs, x) !== undefined ? get(xs, x) : undefined),
    object,
  );
};

export function isNumberKey(key: string): boolean {
  const maybeNumber = Number(key);
  return maybeNumber >= 0 && maybeNumber <= Number.MAX_SAFE_INTEGER;
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
//   obj: ObjectOrArray,
//   key: string | symbol,
//   value: Value,
// ): void {
//   Reflect.set(obj, key, value);
// }

// function setToArray(arr: ObjectOrArray, key: string, value: Value): void {
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
  obj: ObjectOrArray,
  key: string,
  value: Value,
): void {
  Reflect.set(obj, key, value);
  // obj[key] = value
}
function del(obj: ObjectOrArray, key: string): void {
  delete obj[key];
}
export const deepSet = (
  obj: ObjectOrArray,
  keys: Keys,
  value: Value,
): Value => {
  let worker = obj;
  const lastIndex = keys.length - 1;
  let index = -1;
  const removed: Mutation[] = [];
  let currentPath: Keys = [];
  for (const key of keys) {
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
    // const set = (isArray ? setToArray : setToObject);
    const lastRound = index === lastIndex;

    currentPath = [...currentPath, key];

    if (lastRound) {
      removed.push({ type: "set", keys: currentPath, value: worker[key] });
      if (value === undefined) del(worker, key);
      else set(worker, key, value);
    } else {
      if (!isObjectOrArray(worker[key])) {
        removed.push({ type: "set", keys: currentPath, value: worker[key] });
        set(worker, key, isNumberKey(keys[index + 1]) ? [] : {});
      }
    }
    worker = worker[key];
  }

  return removed;
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
      rulePath = [...currentPath];
    }
    index++;
  } while (index < keys.length);

  return { params, [ruleType]: rule, rulePath };
}

export function findAllRules(
  ruleType: string,
  target: Value,
  rules: Rules,
  from: Keys = [],
  currentParams: Params = {},
  currentPath: Keys = [],
): RuleFound[] {
  const rulesFound = [] as RuleFound[];
  const params = { ...currentParams } as Params;
  const maybeRule = rules[ruleType];
  const maybeParam = getParamFromObject(rules);
  if (
    from.length <= currentPath.length &&
    typeof maybeRule === "function"
  ) {
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
        ...findAllRules(ruleType, targetChild, rulesChild, from, params, [
          ...currentPath,
          key,
        ]),
      );
    }
  }
  return rulesFound;
}
export function findRule(
  ruleType: string,
  keys: Keys,
  rules: Rules,
): RuleFound {
  const params: Params = {};
  let index = 0;
  // deno-lint-ignore no-explicit-any
  let worker = rules as any;
  do {
    if (keys.length === index) {
      const maybeRule = worker[ruleType] as Rule;
      return { params, [ruleType]: maybeRule, rulePath: keys };
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
  } while (index <= keys.length);
  return { params, [ruleType]: undefined, rulePath: keys };
}

// export function findAllRules(
//   ruleType: string,
//   target: Value,
//   rules: Rules,
//   from = [],
//   currentParams: Params = {},
//   currentPath: Keys = [],
// ): RuleFound[] {
//   const rulesFound = [] as RuleFound[];
//   const params = { ...currentParams } as Params;
//   const maybeRule = rules[ruleType];
//   const maybeParam = getParamFromObject(rules);
//   if (typeof maybeRule === "function") {
//     rulesFound.push({
//       params: { ...currentParams },
//       rulePath: currentPath,
//       [ruleType]: maybeRule,
//     });
//   }
//   for (const key in target) {
//     let rulesChild = rules[key] as Value;
//     const targetChild = target[key];

//     if (maybeParam && !rulesChild) {
//       params[maybeParam] = key;
//       rulesChild = rules[maybeParam];
//     }
//     if (rulesChild) {
//       rulesFound.push(
//         ...findAllRules(ruleType, targetChild, rulesChild, params, [
//           ...currentPath,
//           key,
//         ]),
//       );
//     }
//   }
//   return rulesFound;
// }

// export const debounce = (fn: (...a: any[]) => any, ms = 0, self: any) => {
//   let timeoutId: number;
//   // deno-lint-ignore no-explicit-any
//   return function (...args: any[]) {
//     clearTimeout(timeoutId);
//     timeoutId = setTimeout(() => fn.apply(self, args), ms);
//   };
// };

// // deno-lint-ignore no-explicit-any
// export const debounce = (fn: Callable, ms = 0, self: any) => {
//   let timeoutId: number;
//   const pending: {
//     resolve: Callable;
//     reject: Callable;
//   }[] = [];
//   // deno-lint-ignore no-explicit-any
//   return (...args: any[]): Promise<void> =>
//     new Promise((res, rej) => {
//       clearTimeout(timeoutId);
//       timeoutId = setTimeout(() => {
//         const currentPending = [...pending];
//         pending.length = 0;
//         Promise.resolve(fn.apply(self, args)).then(
//           (data) => {
//             currentPending.forEach(({ resolve }) => resolve(data));
//           },
//           (error) => {
//             currentPending.forEach(({ reject }) => reject(error));
//           },
//         );
//       }, ms);
//       pending.push({ resolve: res, reject: rej });
//     });
// };

// export const debounce = (fn, ms = 0, self) => {
//   let timeoutId;
//   return function(...args) {
//     clearTimeout(timeoutId);
//     timeoutId = setTimeout(() => fn.apply(self, args), ms);
//   };
// };
export const debounce = function (fn: Callable, delay = 0) {
  let id: number;
  let lastTime: number;
  let pending: [Callable, Callable][] = [];

  async function watcher() {
    if (Date.now() - lastTime > delay) {
      clearInterval(id);
      try {
        id = 0;
        await fn();
        for (const [resolve] of pending) {
          resolve();
        }
      } catch (error) {
        for (const [, reject] of pending) {
          reject(error);
        }
      }

      pending = [];
    }
  }
  function debounced(): Promise<void> {
    lastTime = Date.now();
    if (!id) {
      id = setInterval(watcher, delay);
    }
    return new Promise((r, f) => pending.push([r, f]));
  }
  return debounced;
};

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

// export function debounce(func, wait) {
//   var lastArgs,
//       lastThis,
//       maxWait,
//       result,
//       timerId,
//       lastCallTime,
//       lastInvokeTime = 0,
//       leading = false,
//       maxing = false,
//       trailing = true;

//   if (typeof func != 'function') {
//     throw new TypeError(FUNC_ERROR_TEXT);
//   }
//   wait =(wait) || 0;

//   function invokeFunc(time) {
//     var args = lastArgs,
//         thisArg = lastThis;

//     lastArgs = lastThis = undefined;
//     lastInvokeTime = time;
//     result = func.apply(thisArg, args);
//     return result;
//   }

//   function leadingEdge(time) {
//     // Reset any `maxWait` timer.
//     lastInvokeTime = time;
//     // Start the timer for the trailing edge.
//     timerId = setTimeout(timerExpired, wait);
//     // Invoke the leading edge.
//     return leading ? invokeFunc(time) : result;
//   }

//   function remainingWait(time) {
//     var timeSinceLastCall = time - lastCallTime,
//         timeSinceLastInvoke = time - lastInvokeTime,
//         timeWaiting = wait - timeSinceLastCall;

//     return maxing
//       ? nativeMin(timeWaiting, maxWait - timeSinceLastInvoke)
//       : timeWaiting;
//   }

//   function shouldInvoke(time) {
//     var timeSinceLastCall = time - lastCallTime,
//         timeSinceLastInvoke = time - lastInvokeTime;

//     // Either this is the first call, activity has stopped and we're at the
//     // trailing edge, the system time has gone backwards and we're treating
//     // it as the trailing edge, or we've hit the `maxWait` limit.
//     return (lastCallTime === undefined || (timeSinceLastCall >= wait) ||
//       (timeSinceLastCall < 0) || (maxing && timeSinceLastInvoke >= maxWait));
//   }

//   function timerExpired() {
//     var time = Date.now();
//     if (shouldInvoke(time)) {
//       return trailingEdge(time);
//     }
//     // Restart the timer.
//     timerId = setTimeout(timerExpired, remainingWait(time));
//   }

//   function trailingEdge(time) {
//     timerId = undefined;

//     // Only invoke if we have `lastArgs` which means `func` has been
//     // debounced at least once.
//     if (trailing && lastArgs) {
//       return invokeFunc(time);
//     }
//     lastArgs = lastThis = undefined;
//     return result;
//   }

//   function cancel() {
//     if (timerId !== undefined) {
//       clearTimeout(timerId);
//     }
//     lastInvokeTime = 0;
//     lastArgs = lastCallTime = lastThis = timerId = undefined;
//   }

//   function flush() {
//     return timerId === undefined ? result : trailingEdge(Date.now());
//   }

//   function debounced() {
//     var time = Date.now(),
//         isInvoking = shouldInvoke(time);

//     lastArgs = arguments;
//     lastThis = this;
//     lastCallTime = time;

//     if (isInvoking) {
//       if (timerId === undefined) {
//         return leadingEdge(lastCallTime);
//       }
//       if (maxing) {
//         // Handle invocations in a tight loop.
//         clearTimeout(timerId);
//         timerId = setTimeout(timerExpired, wait);
//         return invokeFunc(lastCallTime);
//       }
//     }
//     if (timerId === undefined) {
//       timerId = setTimeout(timerExpired, wait);
//     }
//     return result;
//   }
//   debounced.cancel = cancel;
//   debounced.flush = flush;
//   return debounced;
// }
