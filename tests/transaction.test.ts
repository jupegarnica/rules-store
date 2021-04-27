import { Store } from "../src/Store.ts";
import type { RuleContext } from "../src/types.ts";
import { assertEquals, assertThrows, spy } from "./test_deps.ts";
import type { Spy } from "./test_deps.ts";

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

Deno.test("[Transactions] on remove", () => {
  const db = new Store();
  db.set("a", [1, 2, 3]);
  db.beginTransaction();
  db.remove("a.1");
  assertEquals(
    db.getPrivateData({ I_PROMISE_I_WONT_MUTATE_THIS_DATA: true }).a,
    [1, 2, 3],
  );
  assertEquals(
    db.getPrivateNewData({ I_PROMISE_I_WONT_MUTATE_THIS_DATA: true }).a,
    [1, 3],
  );
  assertEquals(db.get("a"), [1, 3]);
  db.commit();
  assertEquals(db.get("a"), [1, 3]);
});

Deno.test("[Transactions] on remove", () => {
  const db = new Store();
  db.set("a", [1, 2, 3]);
  db.beginTransaction();
  db.remove("a.1");
  assertEquals(
    db.getPrivateData({ I_PROMISE_I_WONT_MUTATE_THIS_DATA: true }).a,
    [1, 2, 3],
  );
  assertEquals(
    db.getPrivateNewData({ I_PROMISE_I_WONT_MUTATE_THIS_DATA: true }).a,
    [1, 3],
  );
  assertEquals(db.get("a"), [1, 3]);
  db.commit();
  assertEquals(db.get("a"), [1, 3]);
});

Deno.test("[Transactions] on push subscription", () => {
  // deno-lint-ignore no-explicit-any
  const mock: Spy<any> = spy();

  const db = new Store({ initialData: { a: [1, 2, 3] } });
  db.subscribe(
    "a",
    ({ newData, oldData }) => {
      assertEquals(newData, [1, 2, 3, 10]);
      assertEquals(oldData, [1, 2, 3]);
      mock();
    },
  );
  db.beginTransaction();
  db.push("a", 10);
  assertEquals(mock.calls.length, 0);
  db.commit();
  assertEquals(mock.calls.length, 1);
});

Deno.test("[Transactions] on remove subscription", () => {
  // deno-lint-ignore no-explicit-any
  const mock: Spy<any> = spy();

  const db = new Store({ initialData: { a: [1, 2, 3] } });
  db.subscribe(
    "a.1",
    ({ newData, oldData }) => {
      assertEquals(newData, 3);
      assertEquals(oldData, 2);
      mock();
    },
  );
  db.beginTransaction();
  db.remove("a.1");
  assertEquals(mock.calls.length, 0);
  db.commit();
  assertEquals(mock.calls.length, 1);
});

Deno.test("[Transactions] on remove subscription 2", () => {
  // deno-lint-ignore no-explicit-any
  const mock: Spy<any> = spy();

  const db = new Store({ initialData: { a: [1, 2, 3] } });
  db.subscribe(
    "a",
    ({ newData, oldData }) => {
      assertEquals(newData, [1, 3]);
      assertEquals(oldData, [1, 2, 3]);
      mock();
    },
  );
  db.beginTransaction();
  db.remove("a.1");
  assertEquals(mock.calls.length, 0);
  db.commit();
  assertEquals(mock.calls.length, 1);
});

Deno.test("[Transactions] on remove subscription 3", () => {
  // deno-lint-ignore no-explicit-any
  const mock: Spy<any> = spy();

  const db = new Store({ initialData: { a: [1, 2, 3] } });
  db.subscribe(
    "a",
    ({ newData, oldData }) => {
      assertEquals(newData, [1]);
      assertEquals(oldData, [1, 2, 3]);
      mock();
    },
  );
  db.beginTransaction();
  db.remove("a.1");
  db.remove("a.1");
  assertEquals(mock.calls.length, 0);
  db.commit();
  assertEquals(mock.calls.length, 1);
});

Deno.test("[Transactions] on remove rollback", () => {
  // deno-lint-ignore no-explicit-any
  const mock: Spy<any> = spy();

  const db = new Store({ initialData: { a: [1, 2, 3] } });
  db.subscribe(
    "a",
    mock,
  );
  db.beginTransaction();
  db.remove("a.1");
  db.set("a.1", 10);
  assertEquals(
    db.getPrivateNewData({ I_PROMISE_I_WONT_MUTATE_THIS_DATA: true }).a,
    [1, 10],
  );
  db.remove("a.1");
  assertEquals(mock.calls.length, 0);
  db.rollback();
  assertEquals(db.get("a"), [1, 2, 3]);
});

Deno.test("[Transactions] findAndRemove should perform a transaction", () => {
  // deno-lint-ignore no-explicit-any
  const mock: Spy<any> = spy();

  const db = new Store({ initialData: { a: [1, 2, 3] } });
  db.subscribe(
    "a",
    mock,
  );
  const res = db.findAndRemove("a", ([, val]: KeyValue) => val > 1);

  assertEquals(res, [["1", 2], ["2", 3]]);
  assertEquals(mock.calls.length, 1);
  assertEquals(db.get("a"), [1]);
});

Deno.test("[Transactions] findAndRemove subscription on children once each", () => {
  // deno-lint-ignore no-explicit-any
  const mock: Spy<any> = spy();

  const db = new Store({ initialData: { a: [1, 2, 3] } });
  db.subscribe(
    "a.1",
    mock,
  );
  db.subscribe(
    "a.2",
    mock,
  );
  db.findAndRemove("a", ([, val]: KeyValue) => val > 1);
  assertEquals(mock.calls.length, 2);
  assertEquals(db.get("a"), [1]);
});
