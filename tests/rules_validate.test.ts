// import { Store } from "../src/Store.ts";
// import { assertEquals, assertThrows } from "./test_deps.ts";
// import type { RuleContext } from "../src/types.ts";

// Deno.test("[Rules _validate] list of numbers", () => {
//   const rules = {
//     myNumber: {
//       _write: ({ newData }: RuleContext) => {
//         return Array.isArray(newData);
//       },
//       $index: {
//         _validate: ({ newData }: RuleContext) => {
//           return typeof newData === "number";
//         },
//       },
//     },
//   };

//   const db = new Store({ rules });
//   const A = db.set("myNumber", [1, 2]);
//   assertEquals(A, [1, 2]);
//   db.set("myNumber.2", 3);
//   assertThrows(() => db.set("myNumber.0", false));
//   assertThrows(() => db.set("myNumber", [null]));
// });
