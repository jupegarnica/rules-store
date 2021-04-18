// import { Store } from "../src/Store.ts";
// import { assertEquals, assertThrows } from "./test_deps.ts";
// import type { RuleContext } from "../src/types.ts";

// Deno.test("[Rules Examples]", () => {
//   const rules = {
//     myList: {
//       _write: ({ newData }: RuleContext) => {
//         console.log(newData);
//         return Array.isArray(newData);
//       },
//     },
//   };

//   const db = new Store({ rules });
//   const A = db.set("myList", [1, 2]);
//   assertEquals(A, [1, 2]);
//   db.set("myList.2", 3);

//   // assertThrows(() => db.get("readForbidden.a.b.c"));
// });
