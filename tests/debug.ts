// // import { deepMerge } from "../src/helpers.ts";
// // // // // // // // // import { PermissionError, ValidationError } from "../src/Errors.ts";
import { Store } from "../src/Store.ts";
import { onlyCreate, withTimestamps } from "../src/rulesTemplates.ts";
import { assertEquals, assertThrows, delay, Spy, spy } from "./test_deps.ts";
import { RuleContext, Value } from "../src/types.ts";
const onChange: Spy<void> = spy(() => {});
const db = new Store({
  rules: {
    users: {
      $i: {
        _read: () => true,
        _write: () => true,
        _as: (val: Value, { newData, data }: RuleContext) => {
          console.count();
          console.log({ newData, data, val });
          return val;
        },
      },
    },
  },
  initialData: { users: [{ name: "1" }] },
});
db.observe("users/$i", onChange);

assertEquals(
  db.set("users/0", { name: "2" }),
  { name: "2" },
  // { name: "2", hola: "mundo" },
);
assertEquals(onChange.calls.length, 1);
assertEquals(onChange.calls[0].args[0].oldData, {
  name: "1",
  // hola: "mundo",
});
assertEquals(onChange.calls[0].args[0].$i, "0");
assertEquals(onChange.calls[0].args[0].newData, {
  name: "2",
  // hola: "mundo",
});
