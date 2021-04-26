// // // // // import { deepSet } from "../src/helpers.ts";
// // // // // import { PermissionError, ValidationError } from "../src/Errors.ts";
import { Store } from "../src/Store.ts";
// import { assertEquals, assertThrows, delay, Spy, spy } from "./test_deps.ts";
// const testStorePath = "./test.store.yaml";

// // import type { RuleContext } from "../src/types.ts";
const db = new Store();
db.set("a", [1, 2, 3]);
db.beginTransaction();
db.remove("a.1");

// assertEquals(
//   db.getPrivateNewData({ I_PROMISE_I_WONT_MUTATE_THIS_DATA: true }).a,
//   [1, 2, 3],
// );
// assertEquals(
//   db.getPrivateNewData({ I_PROMISE_I_WONT_MUTATE_THIS_DATA: true }).a,
//   [1, 3],
// );
// assertEquals(db.get("a"), [1, 3]);

db.commit();
console.log(
  db.get(""),
);
