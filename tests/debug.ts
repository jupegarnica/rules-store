// // // import { deepMerge } from "../src/helpers.ts";
// // // // // // // // // // import { PermissionError, ValidationError } from "../src/Errors.ts";
import { Store } from "../src/Store.ts";
// import { onlyCreate, withTimestamps } from "../src/rulesTemplates.ts";
import { assertEquals, assertThrows, delay, Spy, spy } from "./test_deps.ts";
// import { RuleContext, Value } from "../src/types.ts";
// const onChange: Spy<void> = spy(() => {});
const rules = {
  _read: () => true,

  arr: {
    _write: () => true,
    _read: () => false,
  },
};
const db = new Store({
  rules,
  initialData: {
    "arr": [1, 2],
  },
});
db.remove("arr.0", false);
