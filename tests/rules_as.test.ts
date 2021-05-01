import { Store } from "../src/Store.ts";
import type { RuleContext } from "../src/types.ts";
import { assertEquals } from "./test_deps.ts";

Deno.test("[Rules _as] get", () => {
  const rules = {
    _read: () => true,
    _write: () => true,
    a: {
      _as: ({ data }: RuleContext) => ({ ...data, c: 2 }),
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
      _as: ({ data }: RuleContext) => ({ ...data, c: 2 }),
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

Deno.test("[Rules _as] deeper", () => {
  const rules = {
    _read: () => true,
    _write: () => true,
    $x: {
      b: {
        _as: ({ data }: RuleContext) => "b" + (data),
      },
      c: {
        _as: ({ data }: RuleContext) => "c" + (data),
      },
    },
  };
  const db = new Store({ rules, initialData: { a: { b: 1 } } });
  assertEquals(db.set("a", { b: 1, c: 2 }), { b: "b1", c: "c2" });
  assertEquals(db.get("a.b"), "b1");
  assertEquals(db.get("a.c"), "c2");
});
