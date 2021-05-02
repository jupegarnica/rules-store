import { Store } from "../src/Store.ts";
import { assertEquals, assertObjectMatch, assertThrows } from "./test_deps.ts";
import type { RuleContext, Value } from "../src/types.ts";

Deno.test({
  // only: true,
  name: "[Rules Examples] counter",
  fn: () => {
    const rules = {
      count: {
        _read: () => true,
        _write: () => true,
        _validate: (_: Value, { newData, oldData }: RuleContext) => {
          return typeof newData === "number" &&
            (newData - oldData === 1 || !oldData);
        },
      },
    };

    const db = new Store({ rules });
    db.set("count", 0);
    assertEquals(db.get("count"), 0);
    db.set("count", 1);
    assertEquals(db.get("count"), 1);
    assertThrows(() => db.set("count", 10));
    assertThrows(() => db.set("count", 11));
  },
});

Deno.test("[Rules Examples] list of numbers", () => {
  const rules = {
    _read: () => true,
    myNumbers: {
      _write: (_: Value, { newData }: RuleContext) => {
        return Array.isArray(newData);
      },
      $index: {
        _validate: (_: Value, { newData }: RuleContext) => {
          return typeof newData === "number" || typeof newData === "undefined";
        },
      },
    },
  };

  const db = new Store({ rules });
  const A = db.set("myNumbers", [1, 2]);
  assertEquals(A, [1, 2]);
  db.set("myNumbers.2", 3);
  db.push("myNumbers", 4);
  db.remove("myNumbers.0");

  assertThrows(() => db.set("myNumbers.2", null));
  assertThrows(() => db.set("myNumbers", null));
  assertThrows(() => db.push("myNumbers", 5, null));
  assertEquals(db.get("myNumbers"), [2, 3, 4]);
});

Deno.test({
  // only: true,
  name: "[Rules Examples] createAt updateAt",
  fn: () => {
    const now = new Date().toISOString();
    const rules = {
      users: {
        $index: {
          _read: () => true,
          _write: () => true,

          _transform: (_: Value, { newData, data }: RuleContext) => {
            if (data === undefined) {
              // const now = new Date().toISOString();
              // add createAt and updateAt
              return ({ ...newData, createAt: now, updateAt: now });
            } else {
              // ensure createAt is not edited
              return ({ ...newData, createAt: data.createAt, updateAt: now });
            }
          },
          // validate saved contains createdAt and updatedAt
          _validate: (_: Value, { newData }: RuleContext) => {
            return newData.createAt && newData.createAt;
          },
        },
      },
    };

    const db = new Store({ rules, initialData: { users: [] } });
    const newUser = {
      name: "Harriet Labadie",
      email: "Rosalyn_Walter42@hotmail.com",
    };

    const userSaved = db.push("users", newUser);
    assertEquals(userSaved.createAt, now);

    db.set("users/0", {
      name: "name edited",
      email: "Rosalyn_Walter42@hotmail.com",
      createAt: "it will be override",
    });
    assertObjectMatch(db.get("users/0"), {
      name: "name edited",
      email: "Rosalyn_Walter42@hotmail.com",
      createAt: now,
    });
  },
});

// TODO Deno.test("[Rules Examples] Mongo structure")
// TODO Deno.test("[Rules Examples] Tables structure")
