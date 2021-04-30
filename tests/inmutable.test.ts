import { assertEquals, spy } from "./test_deps.ts";
import { Store } from "../src/Store.ts";
import type { Spy } from "./test_deps.ts";
import type { KeyValue, RuleContext, Value } from "../src/types.ts";
import { testCalled } from "../src/helpers.ts";

Deno.test("[Store] Set inmutable behavior", () => {
  const db = new Store();
  const obj = { b: 1 };
  db.set("a", obj);
  obj.b = 2;

  assertEquals(
    db.getPrivateData({ I_PROMISE_I_WONT_MUTATE_THIS_DATA: true }).a.b,
    1,
  );
});

Deno.test("[Store] getPrivateData getPrivateNewData", () => {
  const db = new Store();
  const obj = { b: 1 };
  db.set("a", obj);

  assertEquals(
    db.getPrivateData({ I_PROMISE_I_WONT_MUTATE_THIS_DATA: false }),
    {},
  );
  assertEquals(
    db.getPrivateNewData({ I_PROMISE_I_WONT_MUTATE_THIS_DATA: false }),
    {},
  );
});

Deno.test("[Store] Set function inmutable behavior", () => {
  const db = new Store();
  const a = { b: 1 };
  db.set("a", a);
  db.set("a", (data: Value) => {
    assertEquals(
      db.getPrivateData({ I_PROMISE_I_WONT_MUTATE_THIS_DATA: true }) !== data,
      true,
    );
    assertEquals(
      db.getPrivateData({ I_PROMISE_I_WONT_MUTATE_THIS_DATA: true }).b !==
        data.b,
      true,
    );
    assertEquals(
      db.getPrivateNewData({ I_PROMISE_I_WONT_MUTATE_THIS_DATA: true }) !==
        data,
      true,
    );
    assertEquals(
      db.getPrivateNewData({ I_PROMISE_I_WONT_MUTATE_THIS_DATA: true }).b !==
        data.b,
      true,
    );
    data.b = 2;
    return { b: 1 };
  });
  const B = db.get("a.b");
  assertEquals(B, 1);
  assertEquals(
    db.getPrivateNewData({ I_PROMISE_I_WONT_MUTATE_THIS_DATA: true }).a.b,
    1,
  );
  assertEquals(
    db.getPrivateData({ I_PROMISE_I_WONT_MUTATE_THIS_DATA: true }).a.b,
    1,
  );
});

Deno.test("[Store] find inmutable behavior", () => {
  const db = new Store();
  const a = { b: { c: { d: 1 } } };
  db.set("a", a);
  db.find("a", ([, data]) => {
    data.c.d = 2;
    return true;
  });
  assertEquals(
    db.getPrivateData({ I_PROMISE_I_WONT_MUTATE_THIS_DATA: true }).a.b.c.d,
    1,
  );
  const B = db.get("a.b.c.d");
  assertEquals(B, 1);
});

Deno.test("[Store] find inmutable behavior on returned", () => {
  const db = new Store();
  const a = { b: { c: { d: 1 } } };
  db.set("a", a);
  const res = db.find("a", () => {
    return true;
  });
  res[0][1].c.d = 2;
  assertEquals(
    db.getPrivateData({ I_PROMISE_I_WONT_MUTATE_THIS_DATA: true }).a.b.c.d,
    1,
  );
  const B = db.get("a.b.c.d");
  assertEquals(B, 1);
});

Deno.test("[Store] findOne inmutable behavior", () => {
  const db = new Store();
  const a = { b: { c: { d: 1 } } };
  db.set("a", a);
  db.findOne("a", ([, data]) => {
    data.c.d = 2;
    return true;
  });
  assertEquals(
    db.getPrivateData({ I_PROMISE_I_WONT_MUTATE_THIS_DATA: true }).a.b.c.d,
    1,
  );
  const B = db.get("a.b.c.d");
  assertEquals(B, 1);
});

Deno.test("[Store] findOne inmutable behavior on returned", () => {
  const db = new Store();
  const a = { b: { c: { d: 1 } } };
  db.set("a", a);
  const [, value] = db.findOne("a", () => {
    return true;
  });

  value.c.d = 2;

  assertEquals(
    db.getPrivateData({ I_PROMISE_I_WONT_MUTATE_THIS_DATA: true }).a.b.c.d,
    1,
  );
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
  assertEquals(
    db.get("a.b"),
    1,
  );
  assertEquals(calls, 1);
});

Deno.test("[Rules context] data inmutable even root", () => {
  let calls = 0;
  const rule = (context: RuleContext) => {
    calls++;
    context.rootData = {};
    context.newData = 3;
    context.data = 2;
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
  assertEquals(db.set("a.b.c", 1), 1);
  assertEquals(calls, 1);
  assertEquals(db.get("a.b.c"), 1);
  assertEquals(calls, 2);
});

Deno.test("[Rules context] data, newData, rootData inmutable", () => {
  let calls = 0;
  const rule = ({ data, newData, rootData }: RuleContext) => {
    calls++;
    if (data) data.b = 3;
    if (newData) newData.b = 4;
    if (rootData.a) rootData.a.b = 5;
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
  assertEquals(calls, 2);
});

Deno.test("[Rules context] only clone data, newData, rootData on get", () => {
  // deno-lint-ignore no-explicit-any
  const mock: Spy<{ noop: () => any }> = spy(testCalled, "noop");
  const rules = {
    a: {
      _read: (context: RuleContext) => {
        context;
        context.data;
        return true;
      },
      _write: (context: RuleContext) => {
        context.newData;
        context.rootData;
        context.data;
        return true;
      },
    },
  };
  const db = new Store({ rules });
  db.set("a.b", 1);
  assertEquals(mock.calls.length, 3);
  db.get("a.b");
  assertEquals(mock.calls.length, 4);
  mock.restore();
});

Deno.test("[Store] find clone data only on get value", () => {
  const db = new Store();
  // deno-lint-ignore no-explicit-any
  const mock: Spy<{ noop: () => any }> = spy(testCalled, "noop");

  const a = [{ b: 1 }, { b: 2 }, { b: 3 }];
  db.set("a", a);
  db.find("a", () => {
    return true;
  });
  assertEquals(mock.calls.length, 0);

  db.find("a", (pair: KeyValue) => {
    pair[1];
    return true;
  });
  assertEquals(mock.calls.length, 3);
  mock.restore();
});

Deno.test("[Store] find clone only key on get value", () => {
  const db = new Store();
  // deno-lint-ignore no-explicit-any
  const mock: Spy<{ noop: () => any }> = spy(testCalled, "noop");

  const a = [{ b: 1 }];
  db.set("a", a);
  db.find("a", () => {
    return true;
  });
  assertEquals(mock.calls.length, 0);

  db.find("a", ([key]: KeyValue) => {
    return key === "b";
  });
  assertEquals(mock.calls.length, 0);
  mock.restore();
});

Deno.test("[Store] find inmutable behavior on returned", () => {
  const db = new Store();
  const a = { b: { c: { d: 1 } } };
  db.set("a", a);
  const res = db.find("a", () => {
    return true;
  });
  assertEquals(res[0][1].c.d, 1);
  db.set("a.b.c.d", 2);
  assertEquals(res[0][1].c.d, 1);
});

Deno.test("[Store] find sort", () => {
  const db = new Store();

  const a = [{ b: 1 }, { b: 2 }, { b: 3 }];
  db.set("a", a);
  // deno-lint-ignore no-explicit-any
  const res = db.find("a", () => true).sort(([, x]: any, [, y]: any) =>
    y.b - x.b
  );
  assertEquals(res.map(([, v]) => v), [{ b: 3 }, { b: 2 }, { b: 1 }]);
  assertEquals(db.get("a"), [{ b: 1 }, { b: 2 }, { b: 3 }]);
});
// Deno.test("[Store] Proxy a keyValue", () => {
//   const obj = { b: 1 };
//   const _pair = ["a", { b: 9 }] as KeyValue;

//   const pair = new Proxy<KeyValue>(_pair, {
//     get(target:KeyValue, _key: string) {

//       if (_key === "1") {
//         return deepClone(obj);
//       }
//       if (_key === 'length') {
//         return target[(_key)]

//       }

//       return target[Number(_key)]
//     },
//   });

//   assertEquals(pair, ["a", { b: 1 }]);
//   assertEquals(pair[0], "a");
//   assertEquals(Array.isArray(pair), true);
//   assertEquals(pair.length, 2);
//   assertEquals(pair[1] !== _pair[1], true);
//   assertEquals(pair[1].b !== _pair[1].b, true);
//   assertEquals(pair[1].b, 1);
//   assertEquals(_pair[1].b, 9);
// });
