import { Store } from "../src/Store.ts";
import { assertEquals, assertThrows } from "./test_deps.ts";

Deno.test("[Store] Simple set and get", () => {
  const db = new Store();
  db.set("a", 1);
  const A = db.get("a");
  assertEquals(A, 1);

  const B = db.get("a.b");
  assertEquals(B, undefined);
});

Deno.test("[Store] setting arrays", () => {
  const db = new Store();

  db.set("b.0.a", 1);
  const B = db.get("b");

  assertEquals(B, [{ a: 1 }]);

  db.set("c.0.0", 1);
  const C = db.get("c");
  assertEquals(C, [[1]]);

  db.set("d.1.1.1", 1);
  const D = db.get("d");
  assertEquals(D, [, [, [, 1]]]);

  db.set("e", [0]);
  db.set("e.1.1.1", 1);
  const E = db.get("e");
  assertEquals(E, [0, [, [, 1]]]);
});

Deno.test("[Store] invalid root path", () => {
  const db = new Store();
  assertThrows(() => {
    db.set("", []);
  });

  db.set("a", 1);
  assertEquals(db.get(""), { a: 1 });
});

Deno.test("[Store] Deep remove", () => {
  const db = new Store();
  db.set("a.b.c", true);

  const B = db.remove("a.b");

  assertEquals(B, { c: true });
  assertEquals(db.get("a.b.c"), undefined);
});

Deno.test("[Store] Deep remove array child", () => {
  const db = new Store();
  db.set("a.b", [0, 1, 2]);

  const B = db.remove("a.b.1");

  assertEquals(B, 1);
  assertEquals(db.get("a.b"), [0, 2]);
});

Deno.test("[Store] Deep set and get", () => {
  const db = new Store();
  db.set("a.b.c", true);
  const C = db.get("a.b.c");
  assertEquals(C, true);
  const B = db.get("a.b");
  assertEquals(B, { c: true });
});

Deno.test("[Store] Deep set and get undefined", () => {
  const db = new Store();
  db.set("a.b.c", true);
  const C = db.get("a.c");
  assertEquals(C, undefined);
  const B = db.get("a.b.c.z.x.x");
  assertEquals(B, undefined);
});

Deno.test("[Store] push into an array", () => {
  const db = new Store();
  db.set("a.b", []);

  const B = db.push("a.b", 1);

  assertEquals(B, 1);
  assertEquals(db.get("a.b"), [1]);
  const B2 = db.push("a.b", 2, 3, 4);
  assertEquals(B2, [2, 3, 4]);
  assertEquals(db.get("a.b"), [1, 2, 3, 4]);
});

Deno.test("[Store] push into an not array", () => {
  const db = new Store();
  db.set("a.b", {});

  assertThrows(() => {
    db.push("a.b", 1);
  });
});

Deno.test("[Store] Set with a function", () => {
  const db = new Store();
  db.set("a", { b: 1 });
  const B = db.set("a.b", (oldValue: number) => oldValue + 1);
  assertEquals(B, 2);
});

Deno.test("[Store] find in a object", () => {
  const db = new Store();
  db.set("obj", { a: 1, b: 2, c: 3 });
  const results = db.find(
    "obj",
    ([, value]) => value % 2 === 0,
  );

  const [[key, value]] = results;
  assertEquals(results.length, 1);
  assertEquals(value, 2);
  assertEquals(key, "b");

  assertEquals(Object.fromEntries(results), { b: 2 });
});

Deno.test("[Store] find in a array", () => {
  const db = new Store();
  db.set("arr", [1, 2, 3]);
  const results = db.find(
    "arr",
    ([, value]) => value % 2 !== 0,
  );
  const [[key, value]] = results;
  // console.log([
  //   ["0", 1],
  //   ["2", 3],
  // ], results)
  assertEquals(results, [
    ["0", 1],
    ["2", 3],
  ]);
  assertEquals(results.length, 2);
  assertEquals(value, 1);
  assertEquals(key, "0");

  assertEquals(Object.fromEntries(results), { "0": 1, "2": 3 });
});

Deno.test("[Store] find without result", () => {
  const db = new Store();
  db.set("arr", [1, 2, 3]);
  const result = db.find("arr", ([, value]) => value === 0);
  assertEquals(result, []);
});

Deno.test("[Store] find by key in object", () => {
  const db = new Store();
  db.set("obj", { a: 1, b: 2, c: 3 });

  const result = db.find("obj", ([key]) => key === "a");
  assertEquals(result, [["a", 1]]);
});

Deno.test("[Store] find by key in array", () => {
  const db = new Store();
  db.set("arr", [1, 2, 3]);
  const result = db.find("arr", ([key]) => key === "1");
  assertEquals(result, [["1", 2]]);
});

Deno.test("[Store] find at not object", () => {
  const db = new Store();
  db.set("arr", [1, 2, 3]);
  assertThrows(() => db.find("arr.0", () => true));
});

Deno.test("[Store] findOne not found", () => {
  const db = new Store();
  db.set("a", [1]);

  const result = db.findOne("a", () => false);
  assertEquals(result, ["", undefined]);
});
Deno.test("[Store] findOne in a object", () => {
  const db = new Store();
  db.set("obj", { a: 1, b: 2, c: 3 });
  const result = db.findOne("obj", ([, value]) => value > 0);
  assertEquals(result, ["a", 1]);
});

Deno.test("[Store] findOne in a array", () => {
  const db = new Store();
  db.set("arr", [1, 2, 3]);
  const result = db.findOne("arr", ([, value]) => value > 0);
  assertEquals(result, ["0", 1]);
});

Deno.test("[Store] findOne by key in array", () => {
  const db = new Store();
  db.set("arr", [1, 2, 3]);
  const result = db.findOne(
    "arr",
    ([key]) => Number(key) > 1,
  );
  assertEquals(result, ["2", 3]);
});

Deno.test("[Store] findOne  at not object", () => {
  const db = new Store();
  db.set("arr", [1, 2, 3]);
  assertThrows(() => db.findOne("arr.0", () => true));
});

Deno.test("[Store] findOne array length", () => {
  const db = new Store();
  db.set("arr", [1, 2, 3]);
  assertThrows(() => db.findOne("arr.length", () => true));
});

Deno.test("[Store] findAndRemove by key in obj", () => {
  const db = new Store();
  db.set("obj", { a: 1, b: 2, c: 3 });
  const removed = db.findAndRemove(
    "obj",
    ([, value]) => value > 1,
  );
  assertEquals(removed, [
    ["b", 2],
    ["c", 3],
  ]);
  assertEquals(db.get("obj"), { a: 1 });
});

Deno.test("[Store] findAndRemove by value in array", () => {
  const db = new Store();
  db.set("arr", [1, 2, 3]);
  const removed = db.findAndRemove(
    "arr",
    ([, value]) => value > 1,
  );

  assertEquals(removed, [
    ["1", 2],
    ["2", 3],
  ]);
  assertEquals(db.get("arr"), [1]);
});

Deno.test("[Store] findAndRemove by key in array", () => {
  const db = new Store();
  db.set("arr", [1, 2, 3]);
  const removed = db.findAndRemove(
    "arr",
    ([key]) => Number(key) % 2 === 0,
  );

  assertEquals(removed, [
    ["0", 1],
    ["2", 3],
  ]);
  assertEquals(db.get("arr"), [2]);
});

Deno.test("[Store] findOneAndRemove in a object", () => {
  const db = new Store();
  db.set("obj", { a: 1, b: 2, c: 3 });
  const removed = db.findOneAndRemove(
    "obj",
    ([, value]) => value > 1,
  );
  assertEquals(removed, ["b", 2]);
  assertEquals(db.get("obj"), { a: 1, c: 3 });
});

Deno.test("[Store] findOneAndRemove in a array", () => {
  const db = new Store();
  db.set("arr", [1, 2, 3]);
  const removed = db.findOneAndRemove(
    "arr",
    // deno-lint-ignore no-explicit-any
    ([, value]: any) => value > 1,
  );
  assertEquals(removed, ["1", 2]);
  assertEquals(db.get("arr"), [1, 3]);
});

Deno.test("[Store] invalid set", () => {
  const db = new Store();
  db.set("arr", [1, 2]);
  db.set("obj", { a: 1 });
  assertThrows(() => db.set("obj.1", 3), TypeError, "not Array");
  assertThrows(() => db.set("arr.a", 3), TypeError, "not Object");
});

Deno.test("[Store] invalid set on push", () => {
  const initialData = {
    obj: {},
  };
  const db = new Store({ initialData });
  assertThrows(() => db.push("obj.1", 1), TypeError, "not Array");
});

Deno.test("[Store] Set negative array index", () => {
  const db = new Store();
  db.set("arr", [1, 2, 3]);
  db.set("obj", {});
  db.set("obj.-4", -4);
  assertEquals(db.get("obj"), { "-4": -4 });
  db.set("arr.4", 4);
  assertThrows(() => db.set("arr.-4", -4), TypeError, "not Object");
  assertThrows(() => db.set("arr.a", -4), TypeError, "not Object");
});

// Deno.test("[Store] Set negative array index", () => {
//   const db = new Store();
//   db.set("arr", [1, 2, 3]);

//   db.set("arr.-1", -3);

//   assertEquals(db.get("arr"), [1, 2, -3]);
//   db.set("arr.-2", -2);
//   assertEquals(db.get("arr"), [1, -2, -3]);
//   db.set("arr.-3", -1);
//   assertEquals(db.get("arr"), [-1, -2, -3]);

//   assertThrows(() => db.set("arr.-4", -4), TypeError, "Invalid index");
// });

// Deno.test("[Store] Get negative array index", () => {
//   const db = new Store();
//   db.set("arr", [1, 2, 3]);
//   assertEquals(db.get("arr.-1"), 3);
//   assertEquals(db.get("arr.-2"), 2);
//   assertEquals(db.get("arr.-3"), 1);
//   assertEquals(db.get("arr.-7"), undefined);
// });

// Deno.test("experimental", () => {
//   const db = new Store();
//   db.set("a", [1]);
//   const A = db.get("a");
//   assertEquals(A, [1]);
//   const length = db.get("a.length");
//   assertEquals(length, 1);
// });
