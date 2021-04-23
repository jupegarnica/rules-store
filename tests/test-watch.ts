// import { findAllRules } from "../src/helpers.ts";
import { Store } from "../src/Store.ts";
import { assertEquals, assertThrows } from "./test_deps.ts";
import type { RuleContext } from "../src/types.ts";
// import { ValidationError } from "../src/Errors.ts";

// let calls = 0;
// const rules = {
//   a: {
//     _write({ data, newData }: RuleContext) {
//       calls++;
//      console.log(data, newData);

//       return true;
//     },
//   },
// };
// const db = new Store({ rules, initialDataIfNoFile: { a: 0 } });
// assertThrows(() => db.set("a.1", -3), Error, "not Array");
// assertEquals(calls, 1);

{
  const db = new Store({initialDataIfNoFile: {arr: [1,2,3]}});

  db.set("arr.-1", -3);

  // assertEquals(db.get("arr"), [1, 2, -3]);
  // db.set("arr.-2", -2);
  // assertEquals(db.get("arr"), [1, -2, -3]);
  // db.set("arr.-3", -1);

  // assertEquals(db.get("arr"), [-1, -2, -3]);

  // assertThrows(() => db.set("arr.-4", -4), TypeError, "Invalid index");
}
