// import { Store } from "../core/Store.ts";
// // import { StoreJson } from "../core/StoreJson.ts";
// // // import { assertEquals, assertThrows, delay, Spy, spy } from "./test_deps.ts";
// // // // // import { deepMerge } from "../core/helpers.ts";
// // // // // import { PermissionError, ValidationError } from "../core/Errors.ts";
// // // // // // import { onlyCreate, withTimestamps } from "../core/rulesTemplates.ts";
// // // // // // import { RuleContext, Value } from "../core/types.ts";
// const rules = {
//   counter: {
//     _write: () => true,
//     count: {
//       _read: () => false,
//       _validate: (data) => Number.isInteger(data),
//     },
//   },
// };
// const store = new Store({ rules });

// store.set("counter/count", 1); // ok
// store.set("counter/count", 1.5); // throws ValidationError, 'Validation fails at path /counter/count
// store.set("counter/count", "1"); // throws ValidationError, 'Validation fails at path /counter/count
// store.get("counter/count"); // throws PermissionError, 'read disallowed at path /counter/count'
