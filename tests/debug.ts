// import { Store } from "../src/Store.ts";
// import { assertEquals, assertThrows, delay, Spy, spy } from "./test_deps.ts";
// // import { deepMerge } from "../src/helpers.ts";
// // import { PermissionError, ValidationError } from "../src/Errors.ts";
// // // import { onlyCreate, withTimestamps } from "../src/rulesTemplates.ts";
// // // import { RuleContext, Value } from "../src/types.ts";

// const mock: Spy<void> = spy();

// const db = new Store({ initialData: { a: [1, 2, 3] } });
// db.observe(
//   "a",
//   mock,
// );
// db.beginTransaction();
// db.remove("a.1");
// // db.remove("a.1");

// // console.log(
// //   db.get("a"),
// // );

// db.rollback();

// assertEquals(db.get("a"), [1, 2, 3]);
