import { deepSet } from "../src/helpers.ts";
import { Store } from "../src/Store.ts";
import { assertEquals, assertThrows, delay, Spy, spy } from "./test_deps.ts";
// import type { RuleContext } from "../src/types.ts";
// import { ValidationError } from "../src/Errors.ts";
const data = {};
const removed = deepSet(data, ["a", "b"], 2);

assertEquals(removed, [
  {
    keys: [
      "a",
    ],
    value: undefined,
  },
  {
    keys: [
      "a",
      "b",
    ],
    value: undefined,
  },
]);
