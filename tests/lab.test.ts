import { StoreJson } from "../src/StoreJson.ts";
import type { RuleContext } from "../src/types.ts";
import { assertEquals, assertThrows } from "./test_deps.ts";
Deno.test("[Lab] dates example", () => {
  const rules = {
    _read: () => true,
    a: {
      _write: () => ({ newData }: RuleContext) => newData instanceof Date,
      _transform: ({ newData }: RuleContext) => (newData).toISOString(),
      _validate: ({ newData }: RuleContext) => typeof newData === "string",
      _as: ({ data }: RuleContext) => new Date(data),
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

  const db = new StoreJson({ rules, filename: "tests/test.json" });
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
        _transform: ({ newData }: RuleContext) => {
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
      _write: () => true,
      sym: {
        _write: ({ newData }: RuleContext) => typeof newData === "symbol",
        _transform: ({ newData }: RuleContext) => String(newData.description),
        _as: ({ data }: RuleContext) => Symbol.for(data),
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

// TODO support for Set

// Deno.test("[Lab] Set", () => {

//   const db = new StoreJson({
//     rules: {
//       _read: () => true,
//       _write: () => true,
//       set: {
//         _write: ({ newData }: RuleContext) =>
//           // console.log({ newData }) || Array.isArray(newData) ||
//           newData instanceof Set,
//         _transform: ({ newData }: RuleContext) => [...newData],
//         _as: ({ data }: RuleContext) => new Set(data),
//       },
//     },
//   });
//   const mySet = new Set([1, 2, 3, 3, 3]);
//   console.log(mySet instanceof Set);

//   db.set("set", mySet);
//   // db.write();
//   // db.load();

//   assertEquals(
//     db.get("set"),
//     mySet,
//   );

//   // assertThrows(() => db.set("set", "hola"));
// });

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
