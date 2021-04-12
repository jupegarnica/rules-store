import { createHash } from "./deps.ts";

function isObject(obj: unknown): boolean {
  return typeof obj === "object" && obj !== null;
}
export function getKeys(path: string): string[] {
  return path.split(/[\\\\/\.]/).filter((key) => key); // match "\" "/" o "."
}
// deno-lint-ignore no-explicit-any
export function calcHash(data: any): string {
  const hasher = createHash("sha1");
  if (data === undefined) {
    hasher.update("");
  } else {
    hasher.update(JSON.stringify(data.valueOf()));
  }
  return hasher.toString();
}
export function isValidNumber(key: string): boolean {
  const maybeNumber = Number(key);
  return maybeNumber >= 0;
}
// deno-lint-ignore no-explicit-any
type Objectish = { [key: string]: any };

export const deepGet = (object: Objectish, path: string) => {
  const keys = getKeys(path);
  return keys.reduce(
    (xs, x) => (xs && xs[x] !== undefined ? xs[x] : undefined),
    object,
  );
};

export const deepSet = (
  obj: Objectish,
  path: string,
  // deno-lint-ignore no-explicit-any
  value: any,
  create = true,
) => {
  const keys = getKeys(path);
  let currentObject = obj;
  while (keys.length) {
    const key = keys.shift();
    if (!key) break;
    if (!currentObject) break;

    if (!isObject(currentObject[key]) && create) {
      currentObject[key] = isValidNumber(key) ? [] : {};
    }

    if (!keys.length) {
      currentObject[key] = value;
    }
    currentObject = currentObject[key];
  }

  return obj;
};

export const affectedKeys = (
  path: string,
  // deno-lint-ignore no-explicit-any
  value: any,
  create = true,
) => {
  const obj: Objectish = {};
  const keys = getKeys(path);
  let currentObject = obj;
  while (keys.length) {
    const key = keys.shift();
    if (!key) break;
    if (!currentObject) break;

    if (!isObject(currentObject[key]) && create) {
      currentObject[key] = {};
    }

    if (!keys.length) {
      currentObject[key] = value;
    }
    currentObject = currentObject[key];
  }

  return obj;
};
