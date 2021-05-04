import { Store } from "../core/Store.ts";
import type { Value } from "../core/types.ts";
import { assertEquals, assertThrows } from "./test_deps.ts";

Deno.test("[_writeAs] basic", () => {
  const rules = {
    _write: () => true,
    _read: () => true,
    a: {
      _writeAs: (newData: Value) => newData % 12,
    },
  };
  const db = new Store({ rules });

  const ret = db.set("a", 13);
  assertEquals(db.get("a"), 1);
  assertEquals(ret, 1);
});

Deno.test({
  name: "[_writeAs] runs after validation",
  fn: () => {
    const rules = {
      _write: () => true,
      _read: () => true,
      numbers: {
        $i: {
          _validate: (newData: Value) => typeof newData === "string",
          _writeAs: (newData: Value) => Number(newData),
        },
      },
    };
    const initialData = {
      numbers: [],
    };
    const db = new Store({ rules, initialData });

    db.push("numbers", "1");
    assertEquals(db.get("numbers/0"), 1);
    assertThrows(() => db.set("numbers/1", 2));
    assertEquals(db.get("numbers"), [1]);
  },
});

Deno.test({
  name: "[_writeAs] use with _transform",
  fn: () => {
    const rules = {
      _write: () => true,
      _read: () => true,
      numbers: {
        $i: {
          _transform: Number,
          _validate: (newData: Value) => !Number.isNaN(newData),
          _writeAs: (newData: Value) => String(newData),
        },
      },
    };
    const initialData = {
      numbers: [],
    };
    const db = new Store({ rules, initialData });

    db.push("numbers", "1");
    assertEquals(db.get("numbers/0"), "1");
    assertThrows(() => db.set("numbers/1", "ups"));
    db.push("numbers", 2n);
    db.push("numbers", 3);
    assertEquals(db.get("numbers"), ["1", "2", "3"]);
  },
});
