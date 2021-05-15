import { StoreUrl } from "../core/StoreUrl.ts";
// import { StoreJson } from "../core/StoreJson.ts";
// // // // import { assertEquals, assertThrows, delay, Spy, spy } from "./test_deps.ts";
// // // // // // import { deepMerge } from "../core/helpers.ts";
// // // // // // import { PermissionError, ValidationError } from "../core/Errors.ts";
// // // // // // // import { onlyCreate, withTimestamps } from "../core/rulesTemplates.ts";
// // // // // // // import { RuleContext, Value } from "../core/types.ts";
const store = new StoreUrl({ name: "state" });
console.log(
  store.get(""),
);

store.set("a", 1);
store.persist();
store.deletePersisted();
