import { deepMerge } from "../src/helpers.ts";
// // // // // // // import { PermissionError, ValidationError } from "../src/Errors.ts";
import { Store } from "../src/Store.ts";
import { onlyCreate, withTimestamps } from "../src/rulesTemplates.ts";
import { assertEquals, assertThrows, delay, Spy, spy } from "./test_deps.ts";
// // // const testStorePath = "./test.store.yaml";

// // // // import type { RuleContext } from "../src/types.ts";
const db = new Store({
  initialData: {
    a: 1,
    b: 2,
    c: 3,
  },
  rules: {
    _read: () => true,
    _write: () => true,
    _transform: ({ newData }) => {
      const _new = ({
        ...newData,
        a: 33,
      });
      console.log(_new);
      return _new;
    },
  },
});

db.set("d", 4);

assertEquals(
  db.get(""),
  4,
);
