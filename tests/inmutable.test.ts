import { assertEquals, assertThrows } from "./test_deps.ts";
import { Store } from "../src/Store.ts";
import type { RuleContext } from "../src/types.ts";

Deno.test("[Store] Set inmutable behavior", () => {
  const db = new Store();
  const obj = { b: 1 };
  db.set("a", obj);
  obj.b = 2;

  assertEquals(db._data.a.b, 1);
  // const B = db.get("a.b");
  // assertEquals(B, 1);
});

Deno.test("[Store] Set function inmutable behavior", () => {
  const db = new Store();
  const a = { b: 1 };
  db.set("a", a);
  // deno-lint-ignore no-explicit-any
  db.set("a", (data:any) => {
    assertEquals(db._data !== data, true);
    assertEquals(db._data.b !== data.b, true);
    assertEquals(db._newData !== data, true);
    assertEquals(db._newData.b !== data.b, true);
    data.b = 2;
    return { b: 1 };
  });
  const B = db.get("a.b");
  assertEquals(B, 1);
  assertEquals(db._newData.a.b, 1);
  assertEquals(db._data.a.b, 1);
});

Deno.test("[Store] find inmutable behavior", () => {
  const db = new Store();
  const a = { b: { c: { d: 1 } } };
  db.set("a", a);
  db.find("a", (data) => {
    data.c.d = 2;
    return true;
  });
  // assertEquals(db._data.a.b.c.d, 1);
  const B = db.get("a.b.c.d");
  assertEquals(B, 1);
});

Deno.test("[Store] findOne inmutable behavior", () => {
  const db = new Store();
  const a = { b: { c: { d: 1 } } };
  db.set("a", a);
  db.findOne("a", (data) => {
    data.c.d = 2;
    return true;
  });
  // assertEquals(db._data.a.b.c.d, 1);
  const B = db.get("a.b.c.d");
  assertEquals(B, 1);
});

Deno.test("[Store] Get inmutable behavior", () => {
  const db = new Store();
  db.set("a", { b: 1 });

  const A = db.get("a");
  A.b = 2;

  const B = db.get("a.b");
  assertEquals(B, 1);
});

Deno.test("[Rules context] rootData inmutable", () => {
  let calls = 0;
  const rules = {
    _write: () => true,
    $a: {
      $b: {
        _read({ rootData }: RuleContext) {
          calls++;
          assertEquals(rootData, { a: { b: 1 } });
          rootData.a.b = 2;
          return true;
        },
      },
    },
  };
  const db = new Store({ rules });
  db.set("a.b", 1);
  db.get("x.y.z");
  assertEquals(calls, 1);
  assertEquals(
    db.get("a.b"),
    1,
  );
  assertEquals(calls, 2);
});

Deno.test("[Rules context] data inmutable", () => {
  let calls = 0;
  const rules = {
    _write: () => true,
    $a: {
      _read({ data }: RuleContext) {
        calls++;
        assertEquals(data, { b: 1 });
        data.b = 2;
        return true;
      },
    },
  };
  const db = new Store({ rules });
  db.set("a.b", 1);
  db.get("a.b");
  assertEquals(calls, 1);
  assertEquals(
    db.get("a.b"),
    1,
  );
  assertEquals(calls, 2);
});

Deno.test("[Rules context] data inmutable even", () => {
  let calls = 0;
  const rule = (context: RuleContext) => {
    calls++;
    assertThrows(() => {
      context.rootData = {};
    });
    assertThrows(() => {
      context.newData = 3;
    });
    assertThrows(() => {
      context.data = 2;
    });
    return true;
  };
  const rules = {
    _write: () => true,
    $a: {
      $b: {
        _write: rule,
        _read: rule,
      },
    },
  };
  const db = new Store({ rules });
  db.set("a.b", 1);
  assertEquals(calls, 1);
  db.get("a.b.c");
  assertEquals(calls, 2);
});

// TODO
Deno.test("[Rules context] data inmutable even when cloneData = false", () => {
  let calls = 0;
  const rule = ({ data, newData, rootData }: RuleContext) => {
    calls++;
     if (data) data.b = 3;
     if (newData) newData.b = 4;

    return true;
  };
  const rules = {
    _write: () => true,
    $a: {
      _write: rule,
      _read: rule,
    },
  };
  const db = new Store({ rules });
  assertEquals(db.set("a.b", 1), 1);
  assertEquals(calls, 1);
  assertEquals(
    db.get("a.b"),
    1,
  );
  // assertEquals(calls, 2);
});
