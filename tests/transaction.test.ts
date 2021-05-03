import { Store } from "../src/Store.ts";
import type { KeyValue, RuleContext, Value } from "../src/types.ts";
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
        _write: (newData: Value) => newData > 0,
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
  const mock: Spy<void> = spy();

  const db = new Store({ initialData: { a: [1, 2, 3] } });
  db.observe(
    "a",
    (newData, { oldData }) => {
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
Deno.test("[Transactions] on push  transaction and rollback", () => {
  const db = new Store({
    initialData: { a: [1, 2, 3] },
  });
  db.beginTransaction();
  db.push("a", 4, 5, 6);
  db.rollback();
  assertEquals(db.get("a"), [1, 2, 3]);
});
Deno.test({
  // only: true,
  name: "[Transactions] on push fails during transaction",
  fn: () => {
    const db = new Store({
      initialData: { a: [1, 2, 3] },
      rules: {
        a: {
          _read: () => true,
          _write: (newData: Value) => newData.length <= 5,
        },
      },
    });
    db.beginTransaction();
    assertThrows(() => {
      db.push("a", 4, 5, 6);
    });
    db.commit();
    assertEquals(db.get("a"), [1, 2, 3]);
  },
});

Deno.test({
  // only: true,
  name: "[Transactions] on push fails during transaction 2",
  fn: () => {
    const db = new Store({
      initialData: { a: [1, 2, 3] },
      rules: {
        a: {
          _read: () => true,
          _write: (newData: Value) => newData.length <= 6,
        },
      },
    });
    db.beginTransaction();
    db.push("a", 4);
    assertThrows(() => {
      db.push("a", 5, 6, 7);
    });
    db.commit();
    assertEquals(db.get("a"), [1, 2, 3, 4]);
  },
});

Deno.test("[Transactions] on remove subscription", () => {
  const mock: Spy<void> = spy();

  const db = new Store({ initialData: { a: [1, 2, 3] } });
  db.observe(
    "a.1",
    (newData, { oldData }) => {
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
  const mock: Spy<void> = spy();

  const db = new Store({ initialData: { a: [1, 2, 3] } });
  db.observe(
    "a",
    (newData, { oldData }) => {
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
  const mock: Spy<void> = spy();

  const db = new Store({ initialData: { a: [1, 2, 3] } });
  db.observe(
    "a",
    (newData, { oldData }) => {
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

Deno.test({
  // only: true,
  name: "[Transactions] on remove rollback",
  fn: () => {
    const mock: Spy<void> = spy();

    const db = new Store({ initialData: { a: [1, 2, 3] } });
    db.observe(
      "a",
      mock,
    );
    db.beginTransaction();
    db.remove("a.1");
    assertEquals(
      db.getPrivateNewData({ I_PROMISE_I_WONT_MUTATE_THIS_DATA: true }).a,
      [1, 3],
    );
    db.set("a.1", 10);
    assertEquals(
      db.getPrivateNewData({ I_PROMISE_I_WONT_MUTATE_THIS_DATA: true }).a,
      [1, 10],
    );
    db.remove("a.1");
    assertEquals(mock.calls.length, 0);
    db.rollback();
    assertEquals(db.get("a"), [1, 2, 3]);
  },
});

Deno.test("[Transactions] findAndRemove should perform a transaction", () => {
  const mock: Spy<void> = spy();

  const db = new Store({ initialData: { a: [1, 2, 3] } });
  db.observe(
    "a",
    mock,
  );
  const res = db.findAndRemove("a", ([, val]: KeyValue) => val > 1);

  assertEquals(res, [["1", 2], ["2", 3]]);
  assertEquals(mock.calls.length, 1);
  assertEquals(db.get("a"), [1]);
});

Deno.test("[Transactions] findAndRemove subscription on children once each", () => {
  const mock: Spy<void> = spy();

  const db = new Store({ initialData: { a: [1, 2, 3] } });
  db.observe(
    "a.1",
    mock,
  );
  db.observe(
    "a.2",
    mock,
  );
  db.findAndRemove("a", ([, val]: KeyValue) => val > 1);
  assertEquals(mock.calls.length, 2);
  assertEquals(db.get("a"), [1]);
});

Deno.test({
  // only: true,
  name: "[Transactions] findAndRemove during a transaction",
  fn: () => {
    const db = new Store({ initialData: { a: [1, 2, 3] } });
    db.beginTransaction();
    db.findAndRemove("a", ([, val]: KeyValue) => val > 1);
    assertEquals(db.get("a"), [1]);
    db.commit();
    assertEquals(db.get("a"), [1]);
  },
});

Deno.test({
  // only: true,
  name: "[Transactions] findAndRemove during a transaction rollback",
  fn: () => {
    const db = new Store({ initialData: { a: [1, 2, 3] } });
    db.beginTransaction();
    db.findAndRemove("a", ([, val]: KeyValue) => val > 1);
    assertEquals(db.get("a"), [1]);
    db.rollback();
    assertEquals(db.get("a"), [1, 2, 3]);
  },
});

Deno.test({
  // only: true,
  name: "[Transactions] findAndRemove during a transaction failing",
  fn: () => {
    const db = new Store({
      initialData: { a: [1, 2, 3] },
      rules: {
        _read: () => true,
        a: {
          $i: {
            _write: (data: Value, { _oldData }: RuleContext) => {
              return data || _oldData !== 2;
            },
          },
        },
      },
    });
    db.beginTransaction();
    db.push("a", 4);
    assertThrows(
      () => db.findAndRemove("a", ([, val]: KeyValue) => val > 1),
    );
    assertEquals(db.get("a"), [1, 2, 3, 4]);
    db.push("a", 5);

    db.commit();
    assertEquals(db.get("a"), [1, 2, 3, 4, 5]);
  },
});

Deno.test({
  // only: true,
  name:
    "[Transactions] findAndRemove during a transaction failing and rollback",
  fn: () => {
    const db = new Store({
      initialData: { a: [1, 2, 3] },
      rules: {
        _read: () => true,
        a: {
          $i: {
            _write: (data: Value, { _oldData }: RuleContext) => {
              return data || _oldData !== 2;
            },
          },
        },
      },
    });
    db.beginTransaction();
    db.push("a", 4);
    assertThrows(
      () => db.findAndRemove("a", ([, val]: KeyValue) => val > 1),
    );
    assertEquals(db.get("a"), [1, 2, 3, 4]);
    db.push("a", 5);
    assertEquals(db.get("a"), [1, 2, 3, 4, 5]);

    db.rollback();
    assertEquals(db.get("a"), [1, 2, 3]);
  },
});
