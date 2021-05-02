import { Store } from "../src/Store.ts";
import { assertEquals, assertThrows, delay } from "./test_deps.ts";
import type { KeyValue, RuleContext, Value } from "../src/types.ts";
import {
  asDate,
  denyAll,
  noCreate,
  noDelete,
  noUpdate,
  onlyCreate,
  onlyRemove,
  onlyUpdate,
  withTimestamps,
} from "../src/rulesTemplates.ts";

Deno.test("[Rules Templates] denyAll", () => {
  const rules = {
    _read: () => true,
    users: {
      $name: denyAll,
      //   $name: {
      //     _read: () => false,
      //     _write: () => false,
      //   },
    },
  };

  const db = new Store({
    rules,
    initialData: { users: { garn: { name: "garn" } } },
  });

  assertThrows(() => db.push("users", { name: "garn2" }));
  assertThrows(() => db.set("users/garn", { name: "garn2" }));
  assertThrows(() => db.set("users/garn/name", "wtf"));
  assertThrows(() => db.set("users/garn", undefined));
  assertThrows(() => db.remove("users/garn"));
});
Deno.test("[Rules Templates] onlyCreate", () => {
  const rules = {
    _read: () => true,
    users: {
      $name: onlyCreate,
      // $name: {
      // _write: ({ data, newData }: RuleContext) =>
      //   data === undefined && newData !== undefined,
      // },
    },
  };

  const db = new Store({ rules });
  db.set("users/garn", { name: "garn" });

  assertThrows(() => db.set("users/garn", { name: "garn2" }));
  assertThrows(() => db.set("users/garn/name", "wtf"));
  assertThrows(() => db.set("users/garn", undefined));
  assertThrows(() => db.remove("users/garn"));
});

Deno.test("[Rules Templates] onlyUpdate", () => {
  const rules = {
    _read: () => true,
    users: {
      $name: onlyUpdate,
      // $name: {
      //   _write: ({ data, newData }: RuleContext) =>
      //     data === undefined || newData === undefined,
      // },
    },
  };

  const db = new Store({
    rules,
    initialData: { users: { garn: { work: "dev" } } },
  });
  db.set("users/garn", { work: "teacher" });
  db.set("users/garn/work", { work: "dev" });

  assertThrows(() => db.set("users/someone", { work: "teacher" }));
  assertThrows(() => db.remove("users/garn"));
});

Deno.test("[Rules Templates] onlyRemove", () => {
  const rules = {
    _read: () => true,
    users: {
      $name: onlyRemove,
      // $name: {
      //   _write: ({ newData }: RuleContext) => newData === undefined,
      // },
    },
  };

  const db = new Store({
    rules,
    initialData: { users: { garn: { work: "dev" } } },
  });
  // no edition
  assertThrows(() => db.set("users/garn", { work: "teacher" }));
  assertThrows(() => db.set("users/garn/work", { work: "wtf" }));
  assertThrows(() => db.set("users/garn/work", undefined));
  assertThrows(() => db.remove("users/garn/work"));
  // no creation
  assertThrows(() => db.set("users/someone", { work: "teacher" }));
  // delete
  db.remove("users/garn");
  db.set("users/garn", undefined);
  db.set("users/someone", undefined);
});

Deno.test("[Rules Templates] noUpdate", () => {
  const rules = {
    _read: () => true,
    users: {
      $name: noUpdate,
      // $name: {
      //   _write: ({ data, newData }: RuleContext) =>
      //     data === undefined || newData === undefined,
      // },
    },
  };

  const db = new Store({
    rules,
    initialData: { users: { garn: { work: "dev" } } },
  });
  // edition
  assertThrows(() => db.set("users/garn", { work: "teacher" }));
  assertThrows(() => db.set("users/garn/work", { work: "wtf" }));
  assertThrows(() => db.set("users/garn/work", undefined));
  assertThrows(() => db.remove("users/garn/work"));
  // creation
  db.set("users/someone", { work: "teacher" });
  // delete
  db.remove("users/garn");
  db.set("users/garn", undefined);
  db.set("users/someone", undefined);
});

Deno.test("[Rules Templates] noDelete", () => {
  const db = new Store({ rules: { a: noDelete } });
  db.set("a", 1);
  db.set("a", 2);
  assertThrows(() => db.remove("a"));
  assertThrows(() => db.findAndRemove("", () => true));
});
Deno.test("[Rules Templates] noCreate", () => {
  const db = new Store({
    rules: {
      _read: () => true,
      a: noCreate,
    },
    initialData: { a: 1 },
  });
  // update
  db.set("a", 2);
  // remove
  db.remove("a");
  db.findAndRemove("", ([key]: KeyValue) => key === "a");
  // creation
  assertThrows(() => db.set("a", 2));
});

Deno.test("[Rules Templates] disallow read root except for one node", () => {
  const rules = {
    _read: () => false,
    users: {
      garn: {
        _read: () => true,
      },
    },
  };

  const db = new Store({
    rules,
    initialData: {
      users: { garn: { work: "dev" }, else: { work: "teacher" } },
    },
  });
  assertThrows(() => db.get("users/else"));
  assertThrows(() => db.get("users/other"));
  assertEquals(db.get("users/garn"), { work: "dev" });
  assertEquals(db.get("users/garn/work"), "dev");
});

Deno.test("[Rules Templates] only one user can be read", () => {
  const rules = {
    users: {
      $name: { _read: () => false },
      garn: { _read: () => true },
    },
  };

  const db = new Store({
    rules,
    initialData: {
      users: { garn: { work: "dev" }, else: { work: "teacher" } },
    },
  });
  assertThrows(() => db.get("users/else"));
  assertThrows(() => db.get("users/other"));
  assertEquals(db.get("users/garn"), { work: "dev" });
  assertEquals(db.get("users/garn/work"), "dev");
});

Deno.test("[Rules Templates] only one user can be read 2", () => {
  const rules = {
    users: {
      $name: { _read: (_: Value, { $name }: RuleContext) => $name === "garn" },
    },
  };

  const db = new Store({
    rules,
    initialData: {
      users: { garn: { work: "dev" }, else: { work: "teacher" } },
    },
  });
  assertThrows(() => db.get("users/else"));
  assertThrows(() => db.get("users/other"));
  assertEquals(db.get("users/garn"), { work: "dev" });
  assertEquals(db.get("users/garn/work"), "dev");
});

Deno.test({
  // only: true,
  name: "[Rules Templates] withTimestamps",
  fn: async () => {
    const rules = {
      _read: () => true,
      _write: () => true,
      users: {
        $index: withTimestamps,
      },
    };

    const db = new Store({ rules, initialData: { users: [] } });
    const newUser = {
      name: "Harriet Labadie",
      email: "Rosalyn_Walter42@hotmail.com",
    };

    const userSaved = db.push("users", newUser);

    assertEquals(typeof userSaved.createAt, "string");
    assertEquals(String(new Date("ups")) === "Invalid Date", true);
    assertEquals(String(new Date(userSaved.createAt)) !== "Invalid Date", true);
    await delay(1);
    assertEquals(new Date(userSaved.createAt) < new Date(), true);

    const userUpdated = db.set("users/0", {
      name: "name edited",
      email: "Rosalyn_Walter42@hotmail.com",
      createAt: "it will be override",
    });
    assertEquals(userUpdated.createAt, userSaved.createAt);
  },
});

Deno.test("[Rules Templates] asDate", () => {
  const rules = {
    _read: () => true,
    date: asDate,
    // date: {
    //   _write: () =>
    //     ({ newData }: RuleContext) =>
    //       newData instanceof Date || newData instanceof String,
    //   _transform: ({ newData }: RuleContext) => new Date(newData).toISOString(),
    //   _as: ({ data }: RuleContext) => new Date(data),
    // },
  };
  const db = new Store({ rules });
  // const dateString = "1999-01-08T23:00:00.000Z";
  const dateString = "1999-01-31";
  const date = new Date(dateString);
  const dateIso = date.toISOString();

  const saved = db.set("date", date);
  const rootRef = db.getRef("");
  assertEquals(saved instanceof Date, true);
  assertEquals(saved, date);
  assertEquals(typeof rootRef.date, "string");
  assertEquals(rootRef.date, dateIso);
  assertThrows(() => db.set("date", "not a date"), RangeError);
  const saved2 = db.set("date", dateString);
  assertEquals(saved2, date);
});
