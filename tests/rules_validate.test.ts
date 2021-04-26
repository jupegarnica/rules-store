import { findAllRules } from "../src/helpers.ts";
import { Store } from "../src/Store.ts";
import { assertEquals, assertThrows } from "./test_deps.ts";
import type { RuleContext } from "../src/types.ts";
import { ValidationError } from "../src/Errors.ts";
const context = { data: "bar", params: {}, newData: undefined, rootData: {} };

Deno.test("[Rules _validate] findAllRules no params", () => {
  const rules = {
    _validate: () => 0,
    a: {
      _validate: () => 1,
      b: {
        _validate: () => 2,
        c: {
          _validate: () => 3,
        },
      },
      x: {
        _validate: () => 4,
      },
    },
  };
  const target = {
    a: { b: { c: null } },
  };
  const found = findAllRules(
    "_validate",
    target,
    rules,
  );
  assertEquals(found.length, 4);
  assertEquals(found[0]["_validate"]?.(context), 0);
  assertEquals(found[0].params, {});
  assertEquals(found[1]["_validate"]?.(context), 1);
  assertEquals(found[1].params, {});
  assertEquals(found[2]["_validate"]?.(context), 2);
  assertEquals(found[2].params, {});
  assertEquals(found[3]["_validate"]?.(context), 3);
  assertEquals(found[3].params, {});
});

Deno.test("[Rules _validate] findAllRules params", () => {
  const rules = {
    _validate: () => 0,
    $a: {
      _validate: () => 1,

      $b: {
        _validate: () => 2,
        c: {
          _validate: () => 3,
        },
      },
      x: {
        _validate: () => 4,
      },
    },
  };
  const target = {
    a: { b: { c: null } },
  };
  const found = findAllRules(
    "_validate",
    target,
    rules,
  );
  assertEquals(found.length, 4);
  assertEquals(found[0]["_validate"]?.(context), 0);
  assertEquals(found[0].params, {});
  assertEquals(found[1]["_validate"]?.(context), 1);
  assertEquals(found[1].params, { $a: "a" });
  assertEquals(found[2]["_validate"]?.(context), 2);
  assertEquals(found[2].params, { $a: "a", $b: "b" });
  assertEquals(found[3]["_validate"]?.(context), 3);
  assertEquals(found[3].params, { $a: "a", $b: "b" });
});

Deno.test("[Rules _validate] findAllRules params with required path", () => {
  const rules = {
    _validate: () => 0,
    $a: {
      _validate: () => 1,

      $b: {
        _validate: () => 2,
        c: {
          _validate: () => 3,
        },
      },
      x: {
        _validate: () => 4,
        c: {
          _validate: () => 5,
        },
      },
    },
  };
  const target = {
    a: { x: { c: null } },
  };
  const found = findAllRules(
    "_validate",
    target,
    rules,
  );
  assertEquals(found.length, 4);
  assertEquals(found[0]["_validate"]?.(context), 0);
  assertEquals(found[0].params, {});
  assertEquals(found[1]["_validate"]?.(context), 1);
  assertEquals(found[1].params, { $a: "a" });
  assertEquals(found[2]["_validate"]?.(context), 4);
  assertEquals(found[2].params, { $a: "a" });
  assertEquals(found[3]["_validate"]?.(context), 5);
  assertEquals(found[3].params, { $a: "a" });
});

Deno.test("[Rules _validate] findAllRules bug", () => {
  const rules = {
    a: {
      $x: {
        _validate: () => true,
      },
    },
  };
  const target = { a: { b: 1, c: 2 } };
  const found = findAllRules(
    "_validate",
    target,
    rules,
  );
  assertEquals(found[0].params, { $x: "b" });
  assertEquals(found[1].params, { $x: "c" });
});

Deno.test("[Rules _validate] list of numbers", () => {
  const rules = {
    _write: () => true,
    numbers: {
      _validate: ({ newData }: RuleContext) => Array.isArray(newData),
      $index: {
        _validate: ({ newData }: RuleContext) => {
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
      _validate: ({ newData }: RuleContext) =>
        newData && typeof newData === "object",
      $b: {
        _validate: ({ $b }: RuleContext) => {
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

Deno.test("[Rules _validate] assert context values", () => {
  let calls = 0;
  const rules = {
    _write: () => true,
    a: {
      _validate({ data, newData, rootData }: RuleContext) {
        calls++;
        assertEquals(data, 0);
        assertEquals(rootData.a, 0);
        assertEquals(newData, 2);
        return true;
      },
    },
  };
  const db = new Store({ rules, initialData: { a: 0 } });
  db.set("a", 2);
  assertEquals(calls, 1);
});
