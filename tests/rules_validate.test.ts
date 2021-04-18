// import { Store } from "../src/Store.ts";
// import { assertEquals, assertThrows } from "./test_deps.ts";
// import type { RuleContext } from "../src/types.ts";

// Deno.test("[Rules] _validate]", () => {
//   const rules = {
//     numbers: {
//       $index: {
//         _validate: ({ newData }: RuleContext) => typeof newData === 'number',
//       },
//     },
//   };

//   const db = new Store({ rules });
//   const A = db.set("numbers", [1,2]);
//   assertEquals(A, 1);

//   // assertThrows(() => db.get("readForbidden.a.b.c"));
// });
