import { Store } from "../src/Store.ts";
import type { Value } from "../src/types.ts";
import { assertEquals, assertThrows } from "./test_deps.ts";

Deno.test("[Rules _as] get", () => {
  const rules = {
    _read: () => true,
    _write: () => true,
    a: {
      _as: (data: Value) => ({ ...data, c: 2 }),
    },
  };
  const db = new Store({ rules, initialData: { a: { b: 1 } } });

  assertEquals(db.get("a.b"), 1);
  assertEquals(db.get("a.c"), undefined);
  assertEquals(db.get("a"), { b: 1, c: 2 });
});

Deno.test("[Rules _as] find", () => {
  const rules = {
    _read: () => true,
    _write: () => true,
    a: {
      _as: (data: Value) => ({ ...data, c: 2 }),
    },
  };
  const db = new Store({ rules, initialData: { a: { b: 1 } } });
  assertEquals(db.findOne("", ([key]) => key === "a"), [
    "a",
    { b: 1, c: 2 },
  ]);
  assertEquals(db.find("", ([key]) => key === "a"), [
    [
      "a",
      { b: 1, c: 2 },
    ],
  ]);
});

Deno.test({
  // only: true,
  name: "[Rules _as] deeper",
  fn: () => {
    const rules = {
      _read: () => true,
      _write: () => true,
      $x: {
        b: {
          _as: (data: Value) => "b" + (data),
        },
        c: {
          _as: (data: Value) => "c" + (data),
        },
      },
    };
    const db = new Store({ rules, initialData: { a: { b: 1 } } });
    assertEquals(db.set("a", { b: 1, c: 2 }), { b: "b1", c: "c2" });
    assertEquals(db.get("a.b"), "b1");
    assertEquals(db.get("a.c"), "c2");
  },
});

Deno.test({
  // only: true,
  name: "[Rules _as] nested",
  fn: () => {
    const rules = {
      _read: () => true,
      _write: () => true,
      $x: {
        _as: (data: Value) => JSON.stringify(data),
        $y: {
          _as: (data: Value) => {
            return ({ ...data, extra: 33 });
          },
          $z: {
            _as: (data: Value) => {
              return "z" + (data);
            },
          },
        },
      },
    };
    const db = new Store({ rules, initialData: { a: { b: { c: 1 } } } });
    assertEquals(db.get("a.b.c"), "z1");
    assertEquals(db.get("a.b"), { c: "z1", extra: 33 });
    assertEquals(db.get("a"), '{"b":{"c":"z1","extra":33}}');
  },
});

Deno.test({
  // only: true,
  name: "[Rules _as] on root",
  fn: () => {
    const rules = {
      _as: () => {},
    };
    assertThrows((() => new Store({ rules })));
  },
});
