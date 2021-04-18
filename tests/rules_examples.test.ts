import { Store } from "../src/Store.ts";
import { assertEquals, assertThrows } from "./test_deps.ts";
import type { RuleContext } from "../src/types.ts";

Deno.test("[Rules Examples] counter", () => {
  const rules = {
    count: {
      _write: ({ newData , data}: RuleContext) => {
        return typeof newData === 'number' && (newData - data === 1 || !data);
      },
    },
  };

  const db = new Store({ rules });
  db.set("count", 0)
  db.set("count", 1)
  assertThrows(() => db.set("count", 10));
  assertThrows(() => db.set("count", 11));
});



Deno.test("[Rules Examples] list of numbers", () => {
  const rules = {
    _read: () => true,
    myNumbers: {
      _write: ({ newData }: RuleContext) => {
        return Array.isArray(newData);
      },
      $index: {
        _write: ({ newData }: RuleContext) => {
          return typeof newData === "number" || typeof newData === "undefined";
        },
      },
    },
  };

  const db = new Store({ rules });
  const A = db.set("myNumbers", [1, 2]);
  assertEquals(A, [1, 2]);
  db.set("myNumbers.2", 3);
  db.push("myNumbers", 1e2);
  db.remove('myNumbers.0');

  assertThrows(() => db.set("myNumbers.2", null));
  assertThrows(() => db.push("myNumbers", 0, null));
  assertThrows(() => db.set("myNumbers", null));
});
