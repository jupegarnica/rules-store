import type {
  Data,
  Keys,
  ObjectKind,
  Params,
  Rule,
  Rules,
  Value,
} from './types.ts';

export function isObject(obj: unknown): boolean {
  return typeof obj === 'object' && obj !== null;
}
export function getKeys(path: string): Keys {
  // match "\" "/" o "."
  const keys = path.split(/[\\\\/\.]/).filter((key) => key);

  return keys;
}

const paramRegex = /^\$.+/;

export function findParam(obj: ObjectKind): string | void {
  for (const key in obj) {
    if (key.match(paramRegex)) return key;
  }
}

export function addChildToKeys(keys: Keys, key: string): Keys {
  return [...keys, key];
}
export const deepClone = (obj: Value) => {
  if (!isObject(obj)) {
    return obj;
  }
  const initialShape = Array.isArray(obj) ? [] : {};
  const clone = Object.assign(initialShape, obj);
  Object.keys(clone).forEach(
    (key) =>
      (clone[key] = isObject(obj[key])
        ? deepClone(obj[key])
        : obj[key]),
  );
  return clone;
};

export function isValidNumber(key: string): boolean {
  const maybeNumber = Number(key);
  return (
    maybeNumber >= 0 && maybeNumber <= Number.MAX_SAFE_INTEGER
  );
}

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
  const rulePath = [] as Keys;
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

      maybeRule = worker[ruleType];
      if (maybeRule) rule = maybeRule;
    } else {
      if (maybeParam) {
        params[maybeParam.replace('$', '')] = key;
        worker = worker[maybeParam];
      } else {
        break;
      }
    }
    rulePath.push(key);
  } while (index++ < keys.length);

  const result = { params, [ruleType]: rule, rulePath };
  return result;
}
