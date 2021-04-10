function isObject(obj: unknown): boolean {
  return typeof obj === 'object' && obj !== null;
}
function getKeys(path: string): string[] {
  return path.split(/[\\\\/\.]/); // match "\" "/" o "."
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
      currentObject[key] = {};
    }

    if (!keys.length) {
      currentObject[key] = value;
    }
    currentObject = currentObject[key];
  }

  return obj;
};
