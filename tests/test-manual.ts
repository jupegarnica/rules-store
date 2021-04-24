import { StoreJson } from "../src/StoreJson.ts";
// import { deepSet } from "../src/helpers.ts";
// import { assertEquals, assertThrows } from "./test_deps.ts";
// import type { RuleContext } from "../src/types.ts";
// import { ValidationError } from "../src/Errors.ts";
const RUNS = 7e4;
console.log(RUNS);
// TODO: AUTOSAVE -> Uncaught RangeError: Maximum call stack size exceeded
const db = new StoreJson({
  filename: `../benchmarks/data/${RUNS}.json`,
  autoSave: true,
});
console.time("");

for (let i = 0; i < RUNS; i++) {
  db.set(`item` + i, { i: { i: { i } } });
}

console.timeEnd("");

db.write();
