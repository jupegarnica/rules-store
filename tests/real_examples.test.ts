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
        _validate: (newData: Value, { _oldData }: RuleContext) =>
          typeof newData === "number" &&
          (newData - _oldData === 1 || !_oldData),
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

Deno.test({
  // only: true,
  name: "[Rules Examples] list of numbers",
  fn: () => {
    const rules = {
      _read: () => true,
      _write: () => true,
      myNumbers: {
        _validate: Array.isArray,
        $index: {
          _validate: (newData: Value) =>
            typeof newData === "number" || typeof newData === "undefined",
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
  },
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

          _transform: (newData: Value, { _oldData }: RuleContext) => {
            if (_oldData === undefined) {
              // const now = new Date().toISOString();
              // add createAt and updateAt
              return ({ ...newData, createAt: now, updateAt: now });
            } else {
              // ensure createAt is not edited
              return ({
                ...newData,
                createAt: _oldData.createAt,
                updateAt: now,
              });
            }
          },
          // validate if contains createdAt and updatedAt
          _validate: (newData: Value) => {
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

Deno.test({
  // only: true,
  name: "[Rules Examples] save maxAge",
  fn: () => {
    const rules = {
      users: {
        _write: () => true,
        _read: () => true,
        // deno-lint-ignore no-explicit-any
        _transform: ({ data }: any) => ({
          data,
          // deno-lint-ignore no-explicit-any
          maxAge: Math.max(...data.map((u: any) => u.age)),
          totalUsers: data.length,
        }),
      },
    };

    const db = new Store({
      rules,
      initialData: { users: { data: [], maxAge: 0 } },
    });
    db.push("users.data", { age: 18 });
    db.push("users.data", { age: 20 });
    db.push("users.data", { age: 56 });
    db.push("users.data", { age: 34 });
    db.push("users.data", { age: 45 });

    assertEquals(db.get("users.totalUsers"), 5);
    assertEquals(db.get("users.maxAge"), 56);
  },
});

Deno.test({
  // only: true,
  name: "[Rules Examples] read maxAge",
  fn: () => {
    const rules = {
      users: {
        _write: () => true,
        _read: () => true,
        // deno-lint-ignore no-explicit-any
        _as: ({ data }: any) => ({
          data,
          // deno-lint-ignore no-explicit-any
          maxAge: Math.max(...data.map((u: any) => u.age)),
          totalUsers: data.length,
        }),
      },
    };

    const db = new Store({
      rules,
      initialData: { users: { data: [] } },
    });
    db.push("users.data", { age: 18 });
    db.push("users.data", { age: 20 });
    db.push("users.data", { age: 56 });
    db.push("users.data", { age: 34 });
    db.push("users.data", { age: 45 });

    assertEquals(db.get("users.totalUsers"), undefined);
    assertEquals(db.get("users.maxAge"), undefined);
    assertEquals(db.get("users").maxAge, 56);
    assertEquals(db.get("users").totalUsers, 5);
  },
});

// TODO Deno.test("[Rules Examples] Mongo structure")
// TODO Deno.test("[Rules Examples] Tables structure")
