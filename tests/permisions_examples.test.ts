import { Store } from "../src/Store.ts";
import { assertEquals, assertThrows } from "./test_deps.ts";
import type { RuleContext } from "../src/types.ts";

Deno.test("[Rules Examples] onlyCreate", () => {
  const rules = {
    _read: () => true,
    users: {
      $name: {
        _write: ({ data, newData }: RuleContext) =>
          data === undefined && newData !== undefined,
      },
    },
  };

  const db = new Store({ rules });
  db.set("users/garn", { work: "dev" });

  assertThrows(() => db.set("users/garn", { work: "teacher" }));
  assertThrows(() => db.set("users/garn/work", "wtf"));
  assertThrows(() => db.set("users/garn", undefined));
  assertThrows(() => db.remove("users/garn"));
});

Deno.test("[Rules Examples] onlyUpdate", () => {
  const rules = {
    _read: () => true,
    users: {
      $name: {
        _write: ({ data, newData }: RuleContext) =>
          data !== undefined && newData !== undefined,
      },
    },
  };

  const db = new Store({
    rules,
    initialData: { users: { garn: { work: "dev" } } },
  });
  db.set("users/garn", { work: "teacher" }); // ok
  db.set("users/garn/work", { work: "dev" }); // ok

  assertThrows(() => db.set("users/someone", { work: "teacher" }));
  assertThrows(() => db.remove("users/garn"));
});

Deno.test("[Rules Examples] onlyRemove", () => {
  const rules = {
    _read: () => true,
    users: {
      $name: {
        _write: ({ newData }: RuleContext) => newData === undefined,
      },
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

Deno.test("[Rules Examples] notUpdate", () => {
  const rules = {
    _read: () => true,
    users: {
      $name: {
        _write: ({ data, newData }: RuleContext) =>
          data === undefined || newData === undefined,
      },
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

Deno.test("[Rules Examples] disallow read root except for one node", () => {
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

Deno.test("[Rules Examples] only one user can be read", () => {
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

Deno.test("[Rules Examples] only one user can be read 2", () => {
  const rules = {
    users: {
      $name: { _read: ({ $name }: RuleContext) => $name === "garn" },
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
