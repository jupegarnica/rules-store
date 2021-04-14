import { createHash } from './deps.ts';
import type { Data, Value } from './types.ts';
function isObject(obj: unknown): boolean {
  return typeof obj === 'object' && obj !== null;
}
export function getKeys(path: string): string[] {
  // match "\" "/" o "."
  const keys = path.split(/[\\\\/\.]/).filter((key) => key);
  if (!path) {
    throw new Error('Invalid path');
  }
  return keys;
}
export function calcHash(data: Value): string {
  const hasher = createHash('sha1');
  if (data === undefined) {
    hasher.update('');
  } else {
    hasher.update(JSON.stringify(data.valueOf()));
  }
  return hasher.toString();
}
export function isValidNumber(key: string): boolean {
  const maybeNumber = Number(key);
  return maybeNumber >= 0;
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
  create = true,
): Value => {
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

// export const affectedKeys = (
//   path: string,
//   value: Value,
//   create = true,
// ) => {
//   const obj: Data = {};
//   const keys = getKeys(path);
//   let currentObject = obj;
//   while (keys.length) {
//     const key = keys.shift();
//     if (!key) break;
//     if (!currentObject) break;

//     if (!isObject(currentObject[key]) && create) {
//       currentObject[key] = {};
//     }

//     if (!keys.length) {
//       currentObject[key] = value;
//     }
//     currentObject = currentObject[key];
//   }

//   return obj;
// };
