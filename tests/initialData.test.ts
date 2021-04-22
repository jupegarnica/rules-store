import { StoreJson } from "../src/StoreJson.ts";
import { assertEquals, assertThrows } from "./test_deps.ts";

// Deno.test("[StoreJson] initialDataIfNoFile", () => {
//   const db = new StoreJson({ initialDataIfNoFile: [1, 2] });
//   db.set("a", 1);

//   console.log(db.get(''));

//   db.write();
//   // const removed = db.findOneAndRemove(
//   //   "arr",
//   //   // deno-lint-ignore no-explicit-any
//   //   ([, value]: any) => value > 1,
//   // );
//   // assertEquals(removed, ["1", 2]);
//   // assertEquals(db.get("arr"), [1, 3]);
// });

// Deno.test("[StoreJson] initialDataIfNoFile", () => {
//   const db = new StoreJson({ initialDataIfNoFile: [1, 2, 3] });
//   db.set("a", 2);
// //   console.log(db.get("").a.b);

//   // db.write();
//   // const removed = db.findOneAndRemove(
//   //   "arr",
//   //   // deno-lint-ignore no-explicit-any
//   //   ([, value]: any) => value > 1,
//   // );
//   // assertEquals(removed, ["1", 2]);
//   // assertEquals(db.get("arr"), [1, 3]);
// });
