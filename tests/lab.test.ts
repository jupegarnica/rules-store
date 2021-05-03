import { StoreJson } from "../src/StoreJson.ts";
import type { Value } from "../src/types.ts";
import { assertEquals, assertThrows } from "./test_deps.ts";
Deno.test("[Lab] dates example", () => {
  const rules = {
    _read: () => true,
    a: {
      _write: () => (newData: Value) => newData instanceof Date,
      _transform: (newData: Value) => (newData).toISOString(),
      _validate: (newData: Value) => typeof newData === "string",
      _as: (data: Value) => new Date(data),
    },
  };
  const db = new StoreJson({ rules });
  const date = new Date("1999-01-08T23:00:00.000Z");
  db.set("a", date);
  const saved = db.get("a");
  const aRef = db.getRef("a");
  assertEquals(saved instanceof Date, true);
  assertEquals(saved, date);
  assertEquals(typeof aRef, "string");
  assertEquals(aRef, "1999-01-08T23:00:00.000Z");
});

Deno.test("[Lab] dates persistance as ISO String", () => {
  const rules = {
    _read: () => true,
    _write: () => () => true,
  };

  const db = new StoreJson({ rules, name: "tests/test.json" });
  const date = new Date("1999-01-08T23:00:00.000Z");
  const iso = date.toISOString();
  db.set("date", date);
  assertEquals(db.get("date"), date);
  db.write();
  db.load();
  assertEquals(db.get("date"), iso);
  // db.deleteStore();
});

Deno.test("[Lab] _transform", () => {
  const db = new StoreJson({
    initialData: {
      props: {
        a: 1,
        b: 2,
        c: 3,
      },
    },
    rules: {
      _read: () => true,
      _write: () => true,
      props: {
        _transform: (newData: Value) => {
          const _new = ({
            ...newData,
            count: Object.keys(newData).length,
          });
          return _new;
        },
      },
    },
  });

  db.set("props.d", 4);

  assertEquals(
    db.get("props.count"),
    4,
  );
});

Deno.test({
  name: "[Lab] _transform on root throws",
  // ignore: true,
  // only: true,
  fn: () => {
    assertThrows(
      () => {
        new StoreJson({
          rules: {
            _transform: () => {},
          },
        });
      },
      Error,
      "_transform",
    );
  },
});

Deno.test("[Lab] symbols", () => {
  const db = new StoreJson({
    rules: {
      _read: () => true,
      sym: {
        _write: (newData: Value) => typeof newData === "symbol",
        _transform: (newData: Value) => String(newData.description),
        _as: (data: Value) => Symbol.for(data),
      },
    },
  });
  const id = Symbol.for("hola");
  db.set("sym", id);
  db.write();
  db.load();

  assertEquals(
    db.get("sym"),
    id,
  );

  assertThrows(() => db.set("sym", "hola"));
  db.deleteStore();
});

Deno.test("[Lab] collection", () => {
  const db = new StoreJson({
    rules: {
      _read: () => true,
      _write: () => true,
      // _validate: Array.isArray,
    },
    initialData: [1, 2, 3],
  });
  db.push("", 4);
  db.write();
  db.load();
  assertEquals(
    db.get(""),
    [1, 2, 3, 4],
  );

  assertEquals(
    db.get("0"),
    1,
  );

  db.deleteStore();
  assertThrows(() => db.set("hola", "mundo"), TypeError, "not Object");
});

Deno.test({
  // only: true,
  name: "[Lab] Set",
  fn: () => {
    const db = new StoreJson({
      rules: {
        _read: () => true,
        set: {
          _write: (newData) => newData instanceof Set,
          _transform: (newData) => [...newData],
          _as: (data) => {
            return new Set(data);
          },
        },
      },
    });
    const mySet = new Set([1, 2, 3, 3, 3]);
    const returned = db.set("set", mySet);

    assertEquals(returned, mySet);
    assertEquals(
      db.get("set"),
      mySet,
    );
    assertEquals(
      db.get("set").has(1),
      true,
    );

    assertThrows(() => db.set("set", "hola"));
  },
});

// Deno.test({
//   name: "[Lab] rules as array",
//   ignore: true,
//   fn: () => {
//     const db = new StoreJson({
//       rules: {
//         _write: () => true,
//         arr: [
//           {
//             _read: () => true,
//           },
//           {
//             _read: () => false,
//           },
//         ],
//       },
//     });
//     db.set("arr", [1, 2]);

//     assertEquals(
//       db.get("arr.0"),
//       1,
//     );
//     assertThrows(() => db.get("arr.1"), Error, "/arr/1");
//   },
// });
