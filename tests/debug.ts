// import { Store } from "../core/Store.ts";
// import { StoreJson } from "../core/StoreJson.ts";
// // import { assertEquals, assertThrows, delay, Spy, spy } from "./test_deps.ts";
// // // // import { deepMerge } from "../core/helpers.ts";
// // // // import { PermissionError, ValidationError } from "../core/Errors.ts";
// // // // // import { onlyCreate, withTimestamps } from "../core/rulesTemplates.ts";
// // // // // import { RuleContext, Value } from "../core/types.ts";

// // const db = new StoreJson({ name: "db.json" });
// const db = new Store();
// const r = /"((?!")((\w)|(\.)))*"/g;
// const r = /"((.)*?)"/gm;
// const r = /(["])(?:(?=(\\?))\2.)*?\1/g;
const r = /"(([.])|[^"])+"/g;
const text = `
 const db = new Store({ rules, initialData: { a: { b: { c: 1 } } } });
    assertEquals(db.get("a.b.c"), "z1");
    assertEquals(db.get("a.b"), { c: "z1", extra: 33 });
    assertEquals(db.get("a"), '{"b":{"c":"z1","extra":33}}');
`;

for (const match of text.matchAll(r)) {
  console.log(match);
}

console.log(
  r.exec(text),
);

// var myArray;
// while ((myArray = r.exec(text)) !== null) {
//   console.log(myArray);
// }
