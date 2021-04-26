// // // // import { deepSet } from "../src/helpers.ts";
// // // // import { PermissionError, ValidationError } from "../src/Errors.ts";
// import { Store } from "../src/Store.ts";
// import { assertEquals, assertThrows, delay, Spy, spy } from "./test_deps.ts";
// import type { RuleContext } from "../src/types.ts";
// const rules = {
//   _write: () => true,
//   _read: () => true,
//   a: {
//     _transform: (
//       { newData }: RuleContext,
//     ) => {
//       assertEquals(newData, { b: { c: 100 } });
//       return ({ b: { c: 1000 } });
//     },
//     b: {
//       _transform: (
//         { newData }: RuleContext,
//       ) => {
//         assertEquals(newData, { c: 10 });
//         return ({ c: 100 });
//       },
//       c: {
//         _transform: () => 10,
//       },
//     },
//   },
// };
// const db = new Store({
//   rules,
//   initialData: { a: { b: { c: 0 } } },
// });
// db.set("a.b.c", 1);

// assertEquals(db.get(""), {
//   "a": {
//     "b": {
//       "c": 1000,
//     },
//   },
// });
