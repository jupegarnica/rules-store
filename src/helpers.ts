import type {
  Data,
  Keys,
  ObjectKind,
  Params,
  Rule,
  Rules,
  Value,
} from "./types.ts";

import { allowSetOnProxy, dataToSet } from "./symbols.ts";

export function isObject(obj: unknown): boolean {
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
export const deepClone = (obj: Value) => {
  if (!isObject(obj)) return obj;
  const initialShape = Array.isArray(obj) ? [] : {};
  const clone = Object.assign(initialShape, obj);
  Object.keys(clone).forEach(
    (key) => (clone[key] = isObject(obj[key]) ? deepClone(obj[key]) : obj[key]),
  );
  return clone;
};

// export const deepClone = (obj: Value) => {
//   if (!isObject(obj)) {
//     return obj;
//   }
//   return JSON.parse(JSON.stringify(obj));
// };

export function isValidNumber(key: string): boolean {
  const maybeNumber = Number(key);
  return (
    maybeNumber >= 0 && maybeNumber <= Number.MAX_SAFE_INTEGER
  );
}

// export const isValidNumber = memo(_isValidNumber);

export const deepGet = (object: Data, keys: Keys): Value => {
  return keys.reduce(
    (xs, x) => (xs && xs[x] !== undefined ? xs[x] : undefined),
    object,
  );
};

export const deepSet = (
  obj: Data,
  keys: Keys,
  value: Value,
): Value => {
  let worker = obj;
  const lastIndex = keys.length - 1;
  let index = 0;
  for (const key of keys) {
    if (!key) break;
    if (!worker) break;
    if (!isObject(worker[key])) {
      worker[key] = isValidNumber(keys[index + 1]) ? [] : {};
    }
    if (index === lastIndex) {
      if (value === undefined) delete worker[key];
      else worker[key] = value;
    }

    worker = worker[key];
    index++;
  }

  return obj;
};

export function findRuleAndParams(
  keys: Keys,
  ruleType: string,
  rules: Rules,
): { params: Params; rulePath: Keys } & {
  [rule: string]: Rule | undefined;
} {
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
    if (isObject(child)) {
      worker = child;
    } else {
      if (maybeParam) {
        params[maybeParam.replace("$", "")] = key;
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
//   if (!isObject(obj)) return obj;

//   for (const key in obj) {
//     Reflect.set(obj, key, deepProxy(obj[key], [...path, key]));
//   }

//   // const root = { root: obj };
//   const proxy = (new Proxy(obj, makeHandler(path))) as Value;
//   return proxy;
// };
