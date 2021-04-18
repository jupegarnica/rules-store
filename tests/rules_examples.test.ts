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
    myNumber: {
      _write: ({ newData }: RuleContext) => {
        return Array.isArray(newData);
      },
      $index: {
        _write: ({ newData }: RuleContext) => {
          return typeof newData === "number";
        },
      },
    },
  };

  const db = new Store({ rules });
  const A = db.set("myNumber", [1, 2]);
  assertEquals(A, [1, 2]);
  db.set("myNumber.2", 3);
  db.push("myNumber", 1e2);
  db.remove('myNumbers.2')
  assertThrows(() => db.set("myNumber.2", null));
  assertThrows(() => db.push("myNumber", 0, null));
  assertThrows(() => db.set("myNumber", null));
});
