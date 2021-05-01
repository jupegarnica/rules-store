import { Store } from "../src/Store.ts";
import type { RuleContext } from "../src/types.ts";
import { assertEquals, assertThrows, spy } from "./test_deps.ts";
import type { Spy } from "./test_deps.ts";

Deno.test("[Rules _transform] basic", () => {
  const rules = {
    _write: () => true,
    _read: () => true,
    a: {
      _transform: (newData: Value) => newData % 12,
    },
  };
  const db = new Store({ rules });

  const ret = db.set("a", 13);
  assertEquals(db.get("a"), 1);
  assertEquals(ret, 1);
});

Deno.test("[Rules _transform] rollback", () => {
  const rules = {
    _write: () => true,
    _read: () => true,
    a: {
      _transform: (newData: Value) => newData % 12,
      _validate: () => false,
    },
  };
  const db = new Store({ rules, initialData: { a: 5 } });

  assertThrows(() => db.set("a", 13));

  assertEquals(db.get("a"), 5);
  assertEquals(db.get(""), { a: 5 });
});

Deno.test("[Rules _transform] in array and obj", () => {
  const rules = {
    _write: () => true,
    _read: () => true,
    numbers: {
      $i: {
        _transform: (newData: Value) => Number(newData),
        _validate: (newData: Value) => !Number.isNaN(newData),
      },
    },
    object: {
      $i: {
        _transform: (newData: Value) => Number(newData),
        _validate: (newData: Value) => !Number.isNaN(newData),
      },
    },
  };
  const initialData = {
    numbers: [],
    object: {},
  };
  const db = new Store({ rules, initialData });

  db.push("numbers", "1");
  assertEquals(db.get("numbers"), [1]);
  assertEquals(db.get("numbers.0"), 1);
  assertThrows(() => db.set("numbers.0", "ups"));
  assertEquals(db.get("numbers"), [1]);

  db.set("object.a", "2");
  assertEquals(db.get("object.a"), 2);
  assertThrows(() => db.set("object.a", "ups"));
});

Deno.test("[Rules _transform] on remove", () => {
  // deno-lint-ignore no-explicit-any
  const mock: Spy<any> = spy();

  const rules = {
    _write: () => true,
    _read: () => true,
    $i: {
      _transform: (newData: Value) => {
        mock();
        return newData === undefined ? undefined : Number(newData);
      },
    },
  };

  const initialData = {
    a: 1,
    b: 2,
  };
  const db = new Store({ rules, initialData });

  const removed = db.remove("a");
  assertEquals(removed, 1);
  assertEquals(mock.calls.length, 1);
  assertEquals(db.get(""), { b: 2 });
});
Deno.test("[Rules _transform] in the parent", () => {
  const rules = {
    _write: () => true,
    _read: () => true,
    a: {
      _transform: (newData: Value) => ({ ...newData, hola: "mundo" }),
    },
  };
  const initialData = {
    a: { b: { c: 1 } },
  };
  const db = new Store({ rules, initialData });

  db.set("a.b.c", "2");
  assertEquals(db.get("a.hola"), "mundo");
});

Deno.test("[Rules _transform] node not touched", () => {
  const rules = {
    _write: () => true,
    _read: () => true,
    a: {
      b: {
        _transform: (newData: Value) => String(newData),
      },
    },
  };
  const db = new Store({
    rules,
    initialData: { a: { b: 1, c: { d: 3 } } },
  });

  db.set("a.c.d", 0);
  assertEquals(db.get("a.b"), 1);
});

Deno.test("[Rules _transform] newData receive the  precedente transformations", () => {
  const rules = {
    _write: () => true,
    _read: () => true,
    a: {
      _transform: (
        newData: Value,
      ) => {
        assertEquals(newData, { b: { c: 100 } });
        return ({ b: { c: 1000 } });
      },
      b: {
        _transform: (
          newData: Value,
        ) => {
          assertEquals(newData, { c: 10 });
          return ({ c: 100 });
        },
        c: {
          _transform: () => 10,
        },
      },
    },
  };
  const db = new Store({
    rules,
    initialData: { a: { b: { c: 0 } } },
  });
  db.set("a.b.c", 1);

  assertEquals(db.get(""), {
    "a": {
      "b": {
        "c": 1000,
      },
    },
  });
});

Deno.test("[Rules _transform] apply all bottom up", () => {
  const rules = {
    _write: () => true,
    _read: () => true,
    a: {
      _transform: (newData: Value) => ({ ...newData, x: 1 }),
      b: {
        _transform: () => ({ c: null, y: 2 }),
        c: {
          _transform: () => 3,
        },
      },
    },
  };
  const db = new Store({
    rules,
    initialData: { a: { b: { c: 0 } } },
  });
  db.set("a.b.c", 1);

  assertEquals(db.get(""), {
    a: {
      x: 1,
      b: {
        c: null,
        y: 2,
      },
    },
  });
});

Deno.test("[Rules _transform] apply rollback if validation fails", () => {
  const rules = {
    _write: () => true,
    _read: () => true,
    a: {
      _transform: () => ({ b: null, x: 1 }),
      b: {
        _transform: () => ({ c: null, y: 2 }),
        c: {
          _transform: () => 3,
          _validate: () => false,
        },
      },
    },
  };
  const db = new Store({
    rules,
    initialData: { a: { b: { c: 0 } } },
  });
  assertThrows(() => db.set("a.b.c", 1));

  assertEquals(db.get(""), { a: { b: { c: 0 } } });
});

Deno.test("[Rules _transform] apply rollback if transform fails", () => {
  const rules = {
    _write: () => true,
    _read: () => true,
    a: {
      _transform: () => {
        throw new Error("ups");
      },
      b: {
        _transform: (newData: Value) => ({ ...newData, x: 1 }),
        c: {
          _transform: () => 1,
        },
      },
    },
  };
  const db = new Store({
    rules,
    initialData: { a: { b: { c: 0 } } },
  });
  assertThrows(() => db.set("a.b.c", 1));
  assertEquals(db.get(""), { a: { b: { c: 0 } } });
  assertEquals(
    db.getPrivateData({ I_PROMISE_I_WONT_MUTATE_THIS_DATA: true }),
    db.getPrivateNewData({ I_PROMISE_I_WONT_MUTATE_THIS_DATA: true }),
  );
});
