import { Store } from "../src/Store.ts";
import { assertEquals, assertThrows } from "./test_deps.ts";
import type { RuleContext, Value } from "../src/types.ts";
import { ValidationError } from "../src/Errors.ts";

Deno.test("[Rules _validate] list of numbers", () => {
  const rules = {
    _write: () => true,
    numbers: {
      _validate: (newData: Value) => Array.isArray(newData),
      $index: {
        _validate: (newData: Value) => {
          return typeof newData === "number";
        },
      },
    },
  };

  const db = new Store({ rules });
  const A = db.set("numbers", [1, 2]);
  assertEquals(A, [1, 2]);
  db.set("numbers.2", 3);
  assertThrows(
    () => db.set("numbers.0", false),
    ValidationError,
    "path /numbers/0",
  );
  assertThrows(() => db.set("numbers", [null]));
  assertThrows(() => db.set("numbers", 1));
});

Deno.test("[Rules _validate] on object", () => {
  const rules = {
    _write: () => true,
    a: {
      _validate: (data: Value) => data && typeof data === "object",
      $b: {
        _validate: (_: Value, { $b }: RuleContext) => {
          return $b === "b";
        },
      },
    },
  };

  const db = new Store({
    rules,
    initialData: { a: { b: 1, c: 2 } },
  });

  db.set("a.b", 0);
  assertThrows(
    () => db.set("a", 1),
    ValidationError,
    "/a",
  );
  assertThrows(
    () => db.set("a", { d: 1 }),
    ValidationError,
    "/a/d",
  );

  assertThrows(
    () => db.set("a", { b: 3, c: 4 }),
    ValidationError,
    "/a/c",
  );

  assertThrows(
    () => db.set("a.c", 5),
    ValidationError,
    "/a/c",
  );
});

Deno.test({
  // only: true,
  name: "[Rules _validate] assert context values",
  fn: () => {
    let calls = 0;
    const rules = {
      _write: () => true,
      a: {
        _validate(data: Value, { oldData, newData, rootData }: RuleContext) {
          calls++;
          assertEquals(oldData, 0);
          assertEquals(rootData.a, 0);
          assertEquals(newData, 2);
          assertEquals(data, 2);
          return true;
        },
      },
    };
    const db = new Store({ rules, initialData: { a: 0 } });
    db.set("a", 2);
    assertEquals(calls, 1);
  },
});
