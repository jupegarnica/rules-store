import { Store } from "../core/Store.ts";
import { StoreYaml } from "../core/StoreYaml.ts";
import { assertEquals, assertObjectMatch, assertThrows } from "./test_deps.ts";
import type { RuleContext, Value } from "../core/types.ts";
import * as bcrypt from "https://deno.land/x/bcrypt@v0.2.4/mod.ts";
import { isEmail } from "https://deno.land/x/isemail/mod.ts";
import { v4 } from "https://deno.land/std@0.95.0/uuid/mod.ts";

// Generate a v4 uuid.
const encrypt = bcrypt.hashSync;
// const decrypt = bcrypt.compareSync;
Deno.test({
  // only: true,
  name: "[Examples] counter",
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
  name: "[Examples] list of numbers",
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
    db.set("myNumbers/2", 3);
    db.push("myNumbers", 4);
    db.remove("myNumbers/0");

    assertThrows(() => db.set("myNumbers/2", null));
    assertThrows(() => db.set("myNumbers", null));
    assertThrows(() => db.push("myNumbers", 5, null));
    assertEquals(db.get("myNumbers"), [2, 3, 4]);
  },
});

Deno.test({
  // only: true,
  name: "[Examples] createAt updateAt",
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
  name: "[Examples] read maxAge",
  fn: () => {
    const rules = {
      users: {
        _write: () => true,
        _read: () => true,
        _as: ({ data }: Value) => ({
          data,
          maxAge: Math.max(...data.map((u: Value) => u.age)),
          totalUsers: data.length,
        }),
      },
    };

    const db = new Store({
      rules,
      initialData: { users: { data: [] } },
    });
    db.push("users/data", { age: 18 });
    db.push("users/data", { age: 20 });
    db.push("users/data", { age: 56 });
    db.push("users/data", { age: 34 });
    db.push("users/data", { age: 45 });

    assertEquals(db.get("users/totalUsers"), undefined);
    assertEquals(db.get("users/maxAge"), undefined);
    assertEquals(db.get("users").maxAge, 56);
    assertEquals(db.get("users").totalUsers, 5);
  },
});

// TODO Deno.test("[Examples] Tables structure")

Deno.test({
  // only: true,
  ignore: true,
  name: "[Examples] auth store",
  fn: () => {
    const initialData = {
      users: {},
      roles: {
        admin: 1,
        client: 2,
      },
      emails: {},
    };
    const rules = {
      emails: {
        _write: () => true,
        _read: () => false,
      },
      roles: {
        _write: () => false,
        _read: () => false,
      },
      users: {
        _write: () => true,
        _read: () => true,
        $uuid: {
          _validate: (user) =>
            user.name && user.email && user.role && user.password,
          name: {
            _validate: (name) => typeof name === "string" && name.length >= 3,
          },
          email: {
            _validate: (email) => isEmail(email),
          },
          role: {
            _validate: (role, { rootData }) => role in rootData.roles,
          },
          password: {
            _transform: (plainPass) => encrypt(plainPass),
          },
        },
      },
    };
    const authStore = new StoreYaml({
      name: "auth.yaml",
      initialData,
      rules,
    });
    authStore.observe(
      "users/$uuid/email",
      (email, { isCreated, isUpdated, isDeleted, oldData, $uuid }) => {
        console.log({ isCreated, isUpdated, isDeleted, oldData, $uuid });
        if (isCreated) {
          authStore.set("emails/" + email, $uuid);
        }
        if (isDeleted) {
          authStore.remove("emails/" + oldData);
        }
        if (isUpdated) {
          authStore.remove("emails/" + oldData);
          authStore.set("emails/" + email, $uuid);
        }

        authStore.write();
      },
    );

    // console.log(("juan@garn.dev"));
    // console.log(isEmail("juan@garn.dev"));

    const newUUID = v4.generate();
    authStore.set("users/" + newUUID, {
      name: "garn",
      email: "juan@garn.dev",
      password: "1234",
      role: "admin",
    });
  },
});
