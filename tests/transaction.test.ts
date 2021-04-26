import { Store } from "../src/Store.ts";
import { assertEquals, assertThrows } from "./test_deps.ts";
import type { RuleContext } from "../src/types.ts";

Deno.test("[Transactions] commit", () => {
  const db = new Store();
  db.set("a", 0);
  db.beginTransaction();
  db.set("a", 1);
  const [[, val]] = db.find("", () => true);
  assertEquals(val, 1);
  const [, val2] = db.findOne("", () => true);
  assertEquals(val2, 1);

  assertEquals(
    db.getPrivateData({ I_PROMISE_I_WONT_MUTATE_THIS_DATA: true }).a,
    0,
  );
  assertEquals(
    db.getPrivateNewData({ I_PROMISE_I_WONT_MUTATE_THIS_DATA: true }).a,
    1,
  );
  assertEquals(db.get("a"), 1);

  db.commit();

  assertEquals(
    db.getPrivateData({ I_PROMISE_I_WONT_MUTATE_THIS_DATA: true }).a,
    1,
  );
  assertEquals(db.get("a"), 1);
});

Deno.test("[Transactions] rollback", () => {
  const db = new Store();
  db.set("a", 0);
  db.beginTransaction();
  db.set("a", 1);
  assertEquals(db.get("a"), 1);
  db.rollback();
  assertEquals(
    db.getPrivateData({ I_PROMISE_I_WONT_MUTATE_THIS_DATA: true }).a,
    0,
  );
  assertEquals(
    db.getPrivateNewData({ I_PROMISE_I_WONT_MUTATE_THIS_DATA: true }).a,
    0,
  );
  assertEquals(db.get("a"), 0);
});

Deno.test("[Transactions] chaining", () => {
  const db = new Store();
  db.set("a", 0);
  db.beginTransaction().set("a", 1);
  assertEquals(db.get("a"), 1);
  db.rollback();
  assertEquals(db.get("a"), 0);
});
Deno.test("[Transactions] fails during transaction", () => {
  const db = new Store({
    rules: {
      a: {
        _read: () => true,
        _write: ({ newData }: RuleContext) => newData > 0,
      },
    },
  });
  db.set("a", 100);
  db.beginTransaction();
  db.set("a", 1);
  assertThrows(() => db.set("a", -1));
  assertEquals(db.get("a"), 1);
  db.rollback();
  assertEquals(db.get("a"), 100);
});

// TODO Fix transaction on remove
// Deno.test("[Transactions] on remove", () => {
//   const db = new Store();
//   db.set("a", [1, 2, 3]);
//   db.beginTransaction();
//   db.remove("a.1");

//   // assertEquals(
//   //   db.getPrivateNewData({ I_PROMISE_I_WONT_MUTATE_THIS_DATA: true }).a,
//   //   [1, 2, 3],
//   // );
//   // assertEquals(
//   //   db.getPrivateNewData({ I_PROMISE_I_WONT_MUTATE_THIS_DATA: true }).a,
//   //   [1, 3],
//   // );
//   // assertEquals(db.get("a"), [1, 3]);

//   db.commit();
//   console.log(
//     db.get(""),
//   );

//   assertEquals(db.get("a"), [1, 3]);
// });
