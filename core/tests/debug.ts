import { StoreUrl } from "../StoreUrl.ts";
// import { StoreJson } from "../StoreJson.ts";
// // // // import { assertEquals, assertThrows, delay, Spy, spy } from "./test_deps.ts";
// // // // // // import { deepMerge } from "../helpers.ts";
// // // // // // import { PermissionError, ValidationError } from "../Errors.ts";
// // // // // // // import { onlyCreate, withTimestamps } from "../rulesTemplates.ts";
// // // // // // // import { RuleContext, Value } from "../types.ts";
const store = new StoreUrl({ name: "state" });
console.log(
  store.get(""),
);

store.set("a", 1);
store.persist();
store.deletePersisted();
