// import { StoreJson } from "../src/StoreJson.ts";
import { debounce } from "../src/helpers.ts";
import { assertEquals, delay, Spy, spy } from "./test_deps.ts";
// import type { RuleContext } from "../src/types.ts";
// import { ValidationError } from "../src/Errors.ts";

// export const debounce = (fn, ms = 0) => {
//   let timeoutId;
//   return function(...args) {
//     timeoutId && clearTimeout(timeoutId);
//     timeoutId = setTimeout(fn, ms, ...args);
//   };
// };
const RUNS = 4;
60709; // fails
60708; // no fails
7e4;

const runner = async (i) => {
  await delay(100);
  console.count("run");
  return i;
};
const logs: Spy = spy(console, "log");
const run: Spy = spy(console, "count");

const debounced = debounce(runner, 1000);

for (let i = 0; i < RUNS - 1; i++) {
  debounced().then(console.log).catch((e) => console.log(e.message));
}
await debounced().finally(console.log);
assertEquals(run.calls.length, 1);
assertEquals(logs.calls.length, RUNS);
