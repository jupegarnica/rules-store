// import { Store } from "../core/Store.ts";
import { StoreJson } from "../core/StoreJson.ts";
// // // import { assertEquals, assertThrows, delay, Spy, spy } from "./test_deps.ts";
// // // // // import { deepMerge } from "../core/helpers.ts";
// // // // // import { PermissionError, ValidationError } from "../core/Errors.ts";
// // // // // // import { onlyCreate, withTimestamps } from "../core/rulesTemplates.ts";
// // // // // // import { RuleContext, Value } from "../core/types.ts";
const store = new StoreJson({ name: "store.json" }); // will load data from './store.yaml' if the file exist

store.set("counter/count", 0);

store.persist();
