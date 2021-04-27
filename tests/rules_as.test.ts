import { findRule } from "../src/helpers.ts";
import { Store } from "../src/Store.ts";
import type { RuleContext } from "../src/types.ts";
import { assertEquals } from "./test_deps.ts";

Deno.test("[Rules _as] findRule", () => {
  const fn = () => 0;
  const rules = {
    _as: fn,

    a: {
      _as: () => 1,
    },
    $else: {
      _as: () => 2,
    },
  };

  assertEquals(findRule("_as", [], rules)["_as"](), 0);
  assertEquals(findRule("_as", [], rules), {
    params: {},
    rulePath: [],
    _as: fn,
  });
  assertEquals(findRule("_as", ["a"], rules)["_as"](), 1);
  assertEquals(findRule("_as", ["b"], rules).params.$else, "b");
  assertEquals(findRule("_as", ["x", "y"], rules), {
    params: {
      $else: "x",
    },
    _as: undefined,
    rulePath: ["x", "y"],
  });
});

Deno.test("[Rules _as] get", () => {
  const rules = {
    _read: () => true,
    _write: () => true,
    a: {
      _as: ({ data }: RuleContext) => ({ ...data, c: 2 }),
    },
  };
  const db = new Store({ rules, initialData: { a: { b: 1 } } });

  assertEquals(db.get("a"), { b: 1, c: 2 });
  assertEquals(db.get("a.b"), 1);
  assertEquals(db.get("a.c"), undefined);
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
