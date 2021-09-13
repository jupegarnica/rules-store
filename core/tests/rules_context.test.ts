import { Store } from "../Store.ts";
import { assertEquals, assertThrows, spy } from "./test_deps.ts";
import type { Spy } from "./test_deps.ts";
import type { RuleContext, Value } from "../types.ts";
import { PermissionError } from "../Errors.ts";

Deno.test({
  // only: true,
  name: "[Rules context] _write assert context values",
  fn: () => {
    let calls = 0;
    const rules = {
      a: {
        _write(data: Value, { oldData, newData, rootData }: RuleContext) {
          calls++;
          assertEquals(data, 2);
          assertEquals(newData, 2);
          assertEquals(rootData.a, 0);
          assertEquals(oldData, 0);
          return true;
        },
      },
    };
    const db = new Store({ rules, initialData: { a: 0 } });
    db.set("a", 2);
    assertEquals(calls, 1);
  },
});

Deno.test("[Rules context] _write newData", () => {
  let calls = 0;
  const rules = {
    people: {
      _read: () => true,
      $name: {
        _write(newData: Value) {
          calls++;
          return (
            typeof newData === "object" && newData && newData.age > 0
          );
        },
      },
    },
  };
  const db = new Store({
    rules,
    initialData: { people: { garn: { age: 1 }, pepe: { age: 2 } } },
  });
  assertEquals(db.get("people/garn/age"), 1);
  assertEquals(db.get("people/pepe/age"), 2);
  assertThrows(() => db.set("people/garn", { age: 0 }));
  assertEquals(calls, 1);
});

Deno.test("[Rules context] _write newData", () => {
  const rules = {
    _read: () => true,

    people: {
      _write(newData: Value) {
        return typeof newData === "object" && newData;
      },
    },
  };
  const db = new Store({ rules });
  db.set("people", { garn: { age: 1 }, pepe: { age: 2 } });
  assertEquals(db.get("people/garn/age"), 1);
  assertEquals(db.get("people/pepe/age"), 2);
});

Deno.test("[Rules context] newData .set and .push from different level", () => {
  let calls = 0;
  const rules = {
    myList: {
      _write: (newData: Value) => {
        calls++;
        return Array.isArray(newData) && newData.length === calls;
      },
    },
  };

  const db = new Store({ rules });
  const A = db.set("myList", [0]);
  assertEquals(calls, 1);
  assertEquals(A, [0]);
  db.set("myList/1", 1);
  assertEquals(calls, 2);
  db.push("myList", 2);
  assertEquals(calls, 3);
  db.push("myList", 3, 4);
  assertEquals(calls, 5);
});

Deno.test({
  // only: true,
  name: "[Rules context] newData .remove from different level",
  fn: () => {
    const onWrite: Spy<void> = spy((newData: Value) => {
      return Array.isArray(newData);
    });
    const rules = {
      _read: () => true,

      myList: {
        _write: onWrite,
      },
    };

    const db = new Store({ rules });
    const A = db.set("myList", [0]);
    assertEquals(onWrite.calls.length, 1);
    assertEquals(A, [0]);
    db.push("myList", 1);
    assertEquals(onWrite.calls.length, 2);
    db.remove("myList/1");
    assertEquals(onWrite.calls.length, 3);
    assertEquals(db.get("myList"), [0]);
  },
});

Deno.test("[Rules context] _read depending the oldData", () => {
  const rules = {
    a: {
      _write: () => true,
      _read: (_: Value, context: RuleContext) => context.oldData.b === 1,
    },
  };
  const db = new Store({ rules });
  db.set("a/b", 1);
  assertEquals(db.get("a/b"), 1);
  db.set("a/b", 2);
  assertThrows(() => db.get("a/b"));
});

Deno.test("[Rules context] params _read", () => {
  let calls = 0;

  const rules = {
    _write: () => true,
    people: {
      $name: {
        _read: (_: Value, context: RuleContext) => {
          calls++;
          assertEquals(typeof context.oldData, "object");
          assertEquals(typeof context.oldData.age, "number");
          return calls === 1;
        },
      },
    },
  };
  const db = new Store({ rules });
  db.set("people", { garn: { age: 1 }, pepe: { age: 2 } });
  assertEquals(db.get("people/garn/age"), 1);
  assertEquals(calls, 1);
  assertThrows(
    () => db.get("people/pepe/age"),
    PermissionError,
    "read disallowed",
  );
});

Deno.test("[Rules context] params _read at root", () => {
  const rules = {
    _write: () => true,
    $rootKey: {
      _read(_: Value, { $rootKey, oldData }: RuleContext) {
        return (
          $rootKey === "people" &&
          typeof oldData === "object" &&
          oldData
        );
      },
    },
  };
  const db = new Store({ rules });
  db.set("people", { garn: { age: 1 }, pepe: { age: 2 } });
  assertEquals(db.get("people/garn/age"), 1);
  assertThrows(
    () => db.get("clients/garn/age"),
    PermissionError,
    "/clients",
  );
});

Deno.test("[Rules context] params _write at root", () => {
  const rules = {
    $rootKey: {
      _write(_: Value, { $rootKey }: RuleContext) {
        return $rootKey === "people";
      },
    },
  };
  const db = new Store({ rules });
  db.set("people", { garn: { age: 1 }, pepe: { age: 2 } });
  assertThrows(() => db.set("clients", { pepe: { age: 2 } }));
});

Deno.test("[Rules context] params multiple params", () => {
  let calls = 0;
  const rules = {
    $a: {
      $b: {
        $c: {
          _write(_: Value, { $a, $b, $c }: RuleContext) {
            calls++;
            return $a === "a" && $b === "b" && $c === "c";
          },
        },
      },
    },
  };
  const db = new Store({ rules });
  db.set("a/b/c", 1);
  assertEquals(calls, 1);
  assertThrows(() => db.set("x/y/z", 1));
  assertEquals(calls, 2);
});

Deno.test("[Rules context] rootData", () => {
  let calls = 0;
  const rules = {
    _write: () => true,
    $a: {
      $b: {
        _read(_: Value, { rootData }: RuleContext) {
          calls++;
          assertEquals(rootData, { a: { b: 1 } });
          return true;
        },
      },
    },
  };
  const db = new Store({ rules });
  db.set("a/b", 1);
  db.get("x/y/z");
  assertEquals(calls, 1);

  db.get("w/x/y/z");
  assertEquals(calls, 2);
});

Deno.test({
  // only: true,
  name: "[Rules context] isCreation isUpdate isRemove",
  fn: () => {
    const mock: Spy<void> = spy(() => true);
    const rules = {
      _read: () => true,

      a: {
        _write: mock,
      },
    };

    const db = new Store({ rules });
    db.set("a", 0);
    assertEquals(mock.calls.length, 1);
    assertEquals(mock.calls[0].args[1].isCreation, true);
    assertEquals(mock.calls[0].args[1].isUpdate, false);
    assertEquals(mock.calls[0].args[1].isRemove, false);
    db.set("a", 0);
    assertEquals(mock.calls.length, 2);
    assertEquals(mock.calls[1].args[1].isCreation, false);
    assertEquals(mock.calls[1].args[1].isUpdate, true);
    assertEquals(mock.calls[1].args[1].isRemove, false);
    db.set("a", 1);
    assertEquals(mock.calls.length, 3);
    assertEquals(mock.calls[2].args[1].isCreation, false);
    assertEquals(mock.calls[2].args[1].isUpdate, true);
    assertEquals(mock.calls[2].args[1].isRemove, false);

    db.remove("a");
    assertEquals(mock.calls.length, 4);
    assertEquals(mock.calls[3].args[1].isCreation, false);
    assertEquals(mock.calls[3].args[1].isUpdate, false);
    assertEquals(mock.calls[3].args[1].isRemove, true);
  },
});
