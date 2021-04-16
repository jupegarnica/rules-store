import type { Data, Value } from "./types.ts";
function isObject(obj: unknown): boolean {
  return typeof obj === "object" && obj !== null;
}
export function getKeys(path: string): string[] {
  // match "\" "/" o "."
  const keys = path.split(/[\\\\/\.]/).filter((key) => key);
  if (!path) {
    throw new Error("Invalid path");
  }
  return keys;
}
export const deepClone = (obj: Value) => {
  if (!isObject(obj)) {
    return obj;
  }
  const initialShape = Array.isArray(obj) ? [] : {};
  const clone = Object.assign(initialShape, obj);
  Object.keys(clone).forEach(
    (key) => (clone[key] = isObject(obj[key]) ? deepClone(obj[key]) : obj[key]),
  );
  return clone;
};

export function isValidNumber(key: string): boolean {
  const maybeNumber = Number(key);
  return (
    maybeNumber >= 0 && maybeNumber <= Number.MAX_SAFE_INTEGER
  );
}

export const deepGet = (object: Data, path: string): Value => {
  const keys = getKeys(path);

  return keys.reduce(
    (xs, x) => (xs && xs[x] !== undefined ? xs[x] : undefined),
    object,
  );
};

export const deepSet = (
  obj: Data,
  path: string,
  value: Value,
): Value => {
  const keys = getKeys(path);
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
