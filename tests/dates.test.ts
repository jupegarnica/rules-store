import { StoreJson } from "../src/StoreJson.ts";
import type { RuleContext } from "../src/types.ts";
import { assertEquals } from "./test_deps.ts";
Deno.test("[Dates] example", () => {
  const rules = {
    _read: () => true,
    a: {
      _write: () => ({ newData }: RuleContext) => newData instanceof Date,
      _transform: ({ newData }: RuleContext) => (newData).toISOString(),
      _validate: ({ newData }: RuleContext) => typeof newData === "string",
      _as: ({ data }: RuleContext) => new Date(data),
    },
  };
  const db = new StoreJson({ rules });
  const date = new Date("1999-01-08T23:00:00.000Z");
  db.set("a", date);
  const saved = db.get("a");
  const root = db.get("");
  assertEquals(saved instanceof Date, true);
  assertEquals(saved, date);
  assertEquals(typeof root.a, "string");
  assertEquals(root.a, "1999-01-08T23:00:00.000Z");
});

Deno.test("[Dates] persistance as ISO String", () => {
  const rules = {
    _read: () => true,
    _write: () => () => true,
  };

  const db = new StoreJson({ rules, filename: "tests//test.json" });
  const date = new Date("1999-01-08T23:00:00.000Z");
  const iso = date.toISOString();
  db.set("date", date);
  assertEquals(db.get("date"), date);
  db.write();
  db.load();
  assertEquals(db.get("date"), iso);
});
