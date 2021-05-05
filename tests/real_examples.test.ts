import { Store } from "../core/Store.ts";
import { StoreYaml } from "../core/StoreYaml.ts";
import { assertEquals, assertObjectMatch, assertThrows } from "./test_deps.ts";
import type { RuleContext, Value } from "../core/types.ts";
import * as bcrypt from "https://deno.land/x/bcrypt@v0.2.4/mod.ts";
import { isEmail } from "https://deno.land/x/isemail/mod.ts";
import { v4 } from "https://deno.land/std@0.95.0/uuid/mod.ts";
import { ValidationError } from "../core/Errors.ts";

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
        _readAs: ({ data }: Value) => ({
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
  // ignore: true,
  name: "[Examples] auth store complex",
  fn: async () => {
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
        _read: () => true,
      },
      roles: {
        _write: () => false,
        _read: () => false,
      },
      users: {
        _write: () => true,
        _read: () => true,
        $uuid: {
          _validate: (user: Value) =>
            // allow delete
            !user ||
            // required field
            (user.name && user.email && user.role && user.password),
          name: {
            _validate: (name: string) =>
              typeof name === "string" && name.length >= 3,
          },
          email: {
            _validate: (email: string, { rootData }: RuleContext) => {
              if (!isEmail(email)) {
                throw new Error("not a valid email");
              }
              if ((email in rootData.emails)) {
                throw new Error("email in use");
              }
              return true;
            },
          },
          role: {
            _validate: (role: string, { rootData }: RuleContext) =>
              role in rootData.roles,
          },
          password: {
            _transform: (plainPass: string) => encrypt(plainPass),
            _readAs: () => "********",
          },
        },
      },
    };
    const authStore = new StoreYaml({
      name: "auth.yaml",
      folder: "tests",
      initialData,
      autoSave: true,
      rules,
    });
    try {
      authStore.observe(
        "users/$uuid/email",
        (email, { isCreation, isUpdate, isRemove, oldData, $uuid }) => {
          if (isCreation) {
            authStore.set("emails/" + email, $uuid);
          }
          if (isRemove) {
            authStore.remove("emails/" + oldData);
          }
          if (isUpdate) {
            authStore.remove("emails/" + oldData);
            authStore.set("emails/" + email, $uuid);
          }
        },
      );

      const uuid = v4.generate();
      const email1 = "juan@garn.dev";
      const email2 = "juan@valencia.io";
      authStore.set("users/" + uuid, {
        name: "garn",
        email: email1,
        password: "1234",
        role: "admin",
      });
      assertEquals(authStore.get("emails/" + email1), uuid);

      authStore.set(`users/${uuid}/email`, email2);

      assertEquals(authStore.get("emails/" + email1), undefined);
      assertEquals(authStore.get("emails/" + email2), uuid);

      // can not create a whole new user with a used email
      assertThrows(
        () => {
          authStore.set("users/" + uuid, {
            name: "other",
            email: email2,
            password: "1234",
            role: "admin",
          });
        },
        Error,
        "in use",
      );
      authStore.remove("/users/" + uuid);
      assertEquals(authStore.get("emails/" + email2), undefined);

      await authStore.writeLazy();
      authStore.deleteStore();
    } catch (error) {
      await authStore.writeLazy();
      authStore.deleteStore();
      throw error;
    }
  },
});

Deno.test({
  // only: true,
  // ignore: true,
  name: "[Examples] auth store readme",
  fn: async () => {
    const initialData = {
      users: {},
    };

    const rules = {
      users: {
        $uuid: {
          _write: () => true,
          _read: () => true,
          email: {
            _validate: (email: string) => isEmail(email),
          },
          password: {
            _validate: (password: string) => password.length >= 8,
            _writeAs: (password: string) => encrypt(password),
            _readAs: () => "********",
          },
        },
      },
    };
    const authStore = new StoreYaml({
      initialData,
      autoSave: true,
      rules,
    });
    const uuid = v4.generate();

    authStore.set("users/" + uuid, {
      email: "juan@geekshubs.com",
      password: "12345678",
    });

    assertEquals(
      authStore.get("users/" + uuid),
      {
        email: "juan@geekshubs.com",
        password: "********",
      },
    );
    try {
      authStore.set("users/" + uuid, {
        email: "@notValidEmail",
        password: "12345678",
      });
    } catch (error) {
      assertEquals(error instanceof ValidationError, true);
      assertEquals(
        error.message,
        `Validation fails at path /users/${uuid}/email`,
      );
    }

    await authStore.writeLazy();
    authStore.deleteStore();
  },
});
