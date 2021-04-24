import { deepSet } from "../src/helpers.ts";
// import { Store } from "../src/Store.ts";
import { assertEquals, assertThrows } from "./test_deps.ts";
// import type { RuleContext } from "../src/types.ts";
// import { ValidationError } from "../src/Errors.ts";

const data = {};

deepSet(data, ["a", "b"], 1);
assertEquals(data, { a: { b: 1 } });

deepSet(data, ["x", "0", "y"], 1);
assertEquals(data, { a: { b: 1 }, x: [{ y: 1 }] });

console.log(data);

assertThrows(() => deepSet(data, ["a", "0", "c"], 2), TypeError, "not Array");


assertThrows(() => deepSet(data, ["x", "a"], 2), TypeError, "not object");
