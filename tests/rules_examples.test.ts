import { Store } from "../src/Store.ts";
import { assertEquals, assertThrows } from "./test_deps.ts";
import type { RuleContext } from "../src/types.ts";

Deno.test("[Rules Examples] list of numbers", () => {
  const rules = {
    myNumber: {
      _write: ({ newData }: RuleContext) => {
        console.log(newData);

        return Array.isArray(newData);
      },
      $index: {
        _write: ({ newData }: RuleContext) => {
          console.log(newData);

          return typeof newData === 'number';
        },
      },
    },
  };

  const db = new Store({ rules });
  const A = db.set("myNumber", [1, 2]);
  assertEquals(A, [1, 2]);
  db.set("myNumber.2", 3);

  assertThrows(() => db.set("myNumber.2", null));
  assertThrows(() => db.set("myNumber", null));
});
