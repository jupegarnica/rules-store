import { findAllRules } from "../src/helpers.ts";
import { Store } from "../src/Store.ts";
import { assertEquals, assertThrows } from "./test_deps.ts";
import type { RuleContext } from "../src/types.ts";
import { ValidationError } from "../src/Errors.ts";

let calls = 0;
const rules = {
  a: {
    _write({ data, newData }: RuleContext) {
      calls++;
      assertEquals(data, 0);
      assertEquals(newData, 2);
      return true;
    },
  },
};
const db = new Store({ rules, initialDataIfNoFile: { a: 0 } });
db.set("a", 2);
assertEquals(calls, 1);
