import { Store } from "../src/Store.ts";
import { assertEquals, assertThrows, delay, Spy, spy } from "./test_deps.ts";
// // import { deepMerge } from "../src/helpers.ts";
// // import { PermissionError, ValidationError } from "../src/Errors.ts";
// // // import { onlyCreate, withTimestamps } from "../src/rulesTemplates.ts";
// // // import { RuleContext, Value } from "../src/types.ts";

const db = new Store({
  rules: {
    _read: () => true,
    _write: () => true,
    set: {
      _write: (newData) => newData instanceof Set,
      _transform: (newData) => [...newData],
      _as: (data) => {
        console.trace(data);
        return new Set(data);
      },
    },
  },
});
const mySet = new Set([1, 2, 3, 3, 3]);
// console.log(mySet instanceof Set);
const returned = db.set("set", mySet);

console.log(
  // returned,
  db.get("set"),
);
