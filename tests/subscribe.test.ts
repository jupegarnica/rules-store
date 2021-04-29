import { PermissionError } from "../src/Errors.ts";
import { Store } from "../src/Store.ts";
import { RuleContext, Subscriber, Value } from "../src/types.ts";
import { assertEquals, assertThrows, spy } from "./test_deps.ts";
import type { Spy } from "./test_deps.ts";
import { testCalled } from "../src/helpers.ts";

Deno.test("[Subscriptions] .subscribe", () => {
  const db = new Store();

  db.set("A", 0);
  let called = 0;
  const onChange: Subscriber = ({ newData }) => {
    called++;
    assertEquals(newData, called);
  };
  const id = db.subscribe("A", onChange);

  assertEquals(id, 1);
  assertEquals(called, 0);

  db.set("A", 1);
  assertEquals(called, 1);

  db.set("A", 2);
  assertEquals(called, 2);
});

Deno.test("[Subscriptions] .subscribe assert payload", () => {
  const db = new Store();

  db.set("A", 0);
  let called = 0;
  const onChange: Subscriber = ({ newData, oldData }) => {
    called++;
    assertEquals(newData, 1);
    assertEquals(oldData, 0);
  };

  const id = db.subscribe("A", onChange);
  assertEquals(id, 1);
  assertEquals(called, 0);

  db.set("A", 1);
  assertEquals(called, 1);
});

Deno.test("[Subscriptions] .subscribe assert payload inmutable", () => {
  const db = new Store();

  db.set("a", { b: 0 });
  let called = 0;
  const onChange: Subscriber = ({ newData, oldData }) => {
    called++;
    newData.b = 2;
    oldData.b = 3;
  };

  const id = db.subscribe("a", onChange);
  assertEquals(id, 1);
  assertEquals(called, 0);

  db.set("a.b", 1);
  assertEquals(called, 1);
  assertEquals(db.get("a"), { b: 1 });
});

Deno.test("[Subscriptions] .subscribe checks read rule", () => {
  const db = new Store({
    rules: { _read: () => false },
    // initialData: { A: 0 },
  });
  assertThrows(() => db.subscribe("A", console.log), PermissionError, "read");
});

Deno.test("[Subscriptions] .subscribe checks read dynamic rule ", () => {
  const mock: Spy<Console> = spy(console, "warn");
  const db = new Store({
    rules: {
      a: {
        _read: ({ data }: RuleContext) => {
          return data === 0;
        },
        _write: () => true,
      },
    },
    initialData: { a: 0 },
  });
  let calls = 0;
  const onChange: Subscriber = () => {
    calls++;
  };
  db.subscribe("a", onChange);
  db.set("a", 1);
  assertEquals(calls, 1);
  db.set("a", 2);
  assertEquals(calls, 1); // no called
  assertEquals(mock.calls.length, 1); // called console.warn
});

Deno.test("[Subscriptions] .subscribe with deeper set", () => {
  const db = new Store();
  db.set("a.b", { c: 0, d: 0 });

  let called = 0;
  const onChange: Subscriber = ({ newData }) => {
    called++;
    assertEquals(newData.c, 1);
  };
  db.subscribe("a.b", onChange);

  assertEquals(called, 0);
  db.set("a.b.c", 1);
  assertEquals(called, 1);
  db.set("a.b.d", 2);
  assertEquals(called, 2);
});
Deno.test("[Subscriptions] .subscribe", () => {
  const db = new Store();

  db.set("A", 1);
  let called = 0;
  const onChange: Subscriber = ({ newData }) => {
    called++;
    assertEquals(newData, called + 1);
  };
  const returned = db.subscribe("A", onChange);

  assertEquals(returned, 1);
  assertEquals(called, 0);

  db.set("A", 2);
  assertEquals(called, 1);

  db.set("A", 3);
  assertEquals(called, 2);
});

Deno.test("[Subscriptions] .subscribe .off", () => {
  const db = new Store();

  db.set("A", 1);

  let called = false;
  const onChange: Subscriber = ({ newData }) => {
    called = true;
    assertEquals(newData, 1);
  };

  const id = db.subscribe("A", onChange);
  assertEquals(called, false);
  assertEquals(db.off(id), true);
  assertEquals(called, false);
  db.set("A", 3); // should not call onChange
  assertEquals(called, false);
  assertEquals(db.off(id), false);
});

Deno.test("[Subscriptions] Deep basic ", () => {
  const db = new Store();
  db.set("a.b.c", true);

  let called = false;
  const onChangeC: Subscriber = ({ newData }) => {
    called = true;
    assertEquals(newData, true);
  };
  const id = db.subscribe("a.b.c", onChangeC);
  assertEquals(id, 1);
  assertEquals(called, false);
});

Deno.test("[Subscriptions] assert newData and oldData", () => {
  const db = new Store();
  db.set("a.b.c", true);
  const onChange: Spy<void> = spy(({ newData, oldData }) => ({
    newData,
    oldData,
  }));

  db.subscribe("a.b", onChange);

  db.set("a.b.c", 33);
  assertEquals(onChange.calls.length, 1);
  assertEquals(onChange.calls[0].args[0].newData, { c: 33 });
  assertEquals(onChange.calls[0].args[0].oldData, { c: true });

  db.set("a.b.d", 34);
  assertEquals(onChange.calls.length, 2);
  assertEquals(onChange.calls[1].args[0].newData, { c: 33, d: 34 });
  assertEquals(onChange.calls[1].args[0].oldData, { c: 33 });

  db.set("a", 1);
  assertEquals(onChange.calls.length, 3);
  assertEquals(onChange.calls[2].args[0].newData, undefined);
  assertEquals(onChange.calls[2].args[0].oldData, { c: 33, d: 34 });

  //  should not be call onChange
  db.set("a.z", true);
  db.set("z", true);

  assertEquals(onChange.calls.length, 3);
});

Deno.test("[Subscriptions] assert newData and oldData cloned", () => {
  const db = new Store();
  db.set("a.b.c", true);
  const mock: Spy<typeof testCalled> = spy(testCalled, "noop");

  db.subscribe("a.b", ({ newData, oldData }) => ({
    newData,
    oldData,
  }));
  db.set("a.b.c", 33);
  assertEquals(mock.calls.length, 2);
  mock.restore();
});

Deno.test("[Subscriptions] assert newData cloned", () => {
  const db = new Store();
  db.set("a.b.c", true);
  const mock: Spy<typeof testCalled> = spy(testCalled, "noop");

  db.subscribe("a.b", ({ newData }) => ({
    newData,
  }));
  db.set("a.b.c", 33);
  assertEquals(mock.calls.length, 1);
  mock.restore();
});

Deno.test("[Subscriptions] inmutable callback", () => {
  const db = new Store();
  db.set("a.b.c", 0);

  let called = 0;
  const onChange = ({ newData }: Value) => {
    called++;
    assertEquals(newData, { c: 1 });
    newData.c = 2;
    assertEquals(newData, { c: 2 });
  };
  db.subscribe("a.b", onChange);

  assertEquals(called, 0);
  db.set("a.b.c", 1);
  assertEquals(called, 1);
  assertEquals(db.get("a.b.c"), 1);
});

Deno.test("[Subscriptions] Deep remove with subscription", () => {
  const db = new Store();
  db.set("a.b.c", 1);

  let called = 0;
  const onChange: Subscriber = ({ newData, oldData }) => {
    called++;
    assertEquals(newData, undefined);
    assertEquals(oldData, 1);
  };
  db.subscribe("a.b.c", onChange);

  assertEquals(called, 0);

  const B = db.remove("a.b");
  assertEquals(called, 1);

  assertEquals(B, { c: 1 });
  assertEquals(db.get("a.b.c"), undefined);
});

Deno.test("[Subscriptions] .subscribe with params", () => {
  const onChange: Spy<void> = spy();
  const db = new Store();
  db.subscribe("$x", onChange);
  db.set("a", 1);
  assertEquals(onChange.calls.length, 1);
});

Deno.test("[Subscriptions] .subscribe with params args", () => {
  const onChange: Spy<void> = spy();
  const db = new Store();
  db.subscribe("$x", onChange);
  db.set("a", 1);
  assertEquals(onChange.calls[0].args[0].oldData, undefined);
  assertEquals(onChange.calls[0].args[0].newData, 1);
  assertEquals(onChange.calls[0].args[0].$x, "a");
});

Deno.test("[Subscriptions] .subscribe with params args", () => {
  const onChange: Spy<void> = spy();
  const db = new Store();
  db.subscribe("a/$x", onChange);
  db.set("a", { b: 1, c: 2 });
  assertEquals(onChange.calls.length, 2);

  assertEquals(onChange.calls[0].args[0].oldData, undefined);
  assertEquals(onChange.calls[0].args[0].newData, 1);
  assertEquals(onChange.calls[0].args[0].$x, "b");
  assertEquals(onChange.calls[1].args[0].oldData, undefined);
  assertEquals(onChange.calls[1].args[0].newData, 2);
  assertEquals(onChange.calls[1].args[0].$x, "c");
});

Deno.test({
  only: false,
  name: "[Subscriptions] .subscribe with params args push",
  fn: () => {
    const onChange: Spy<void> = spy(() => {});
    const db = new Store({
      initialData: { users: [] },
    });
    db.subscribe("users/$id/name", onChange);

    db.push("users", { name: "garn" }, { name: "garni" });

    assertEquals(onChange.calls.length, 2);
    assertEquals(onChange.calls[0].args[0].oldData, undefined);
    assertEquals(onChange.calls[0].args[0].newData, "garn");
    assertEquals(onChange.calls[0].args[0].$id, "0");
    assertEquals(onChange.calls[1].args[0].oldData, undefined);
    assertEquals(onChange.calls[1].args[0].newData, "garni");
    assertEquals(onChange.calls[1].args[0].$id, "1");
  },
});

Deno.test({
  only: false,
  name: "[Subscriptions] .subscribe with params args remove",
  fn: () => {
    const onChange: Spy<void> = spy(() => {});
    const db = new Store({
      initialData: { users: [{ name: "garn" }, { name: "garni" }] },
    });
    db.subscribe("users/$id/name", onChange);

    db.remove("users/0");
    assertEquals(onChange.calls.length, 1);
    assertEquals(onChange.calls[0].args[0].oldData, "garn");
    assertEquals(onChange.calls[0].args[0].newData, undefined);
    assertEquals(onChange.calls[0].args[0].$id, "0");
  },
});

Deno.test({
  only: false,
  name: "[Subscriptions] .subscribe on transaction",
  fn: () => {
    const onChange: Spy<void> = spy(() => {});
    const db = new Store({
      initialData: { users: [{ name: "garn" }, { name: "garni" }] },
    });
    db.subscribe("users/$id/name", onChange);
    db.beginTransaction();
    db.remove("users/1");
    db.remove("users/0");
    db.commit();
    assertEquals(onChange.calls.length, 2);
    assertEquals(onChange.calls[0].args[0].oldData, "garn");
    assertEquals(onChange.calls[0].args[0].newData, undefined);
    assertEquals(onChange.calls[0].args[0].$id, "0");
    assertEquals(onChange.calls[1].args[0].oldData, "garni");
    assertEquals(onChange.calls[1].args[0].newData, undefined);
    assertEquals(onChange.calls[1].args[0].$id, "1");
  },
});

Deno.test({
  only: false,
  name: "[Subscriptions] .subscribe on transaction",
  fn: () => {
    const onChange: Spy<void> = spy(() => {});
    const db = new Store({
      initialData: { users: [{ name: "garn" }, { name: "garni" }] },
    });
    db.subscribe("users/0/name", onChange);
    db.beginTransaction();
    db.remove("users/0");
    db.remove("users/0");
    db.push("users", { name: "garni2" });
    db.commit();
    assertEquals(onChange.calls.length, 1);
    assertEquals(onChange.calls[0].args[0].oldData, "garn");
    assertEquals(onChange.calls[0].args[0].newData, "garni2");
  },
});

Deno.test({
  only: false,
  name: "[Subscriptions] .subscribe on transaction",
  fn: () => {
    const onChange: Spy<void> = spy(() => {});
    const db = new Store({
      initialData: { users: [{ name: "garn" }, { name: "garni" }] },
    });
    db.subscribe("users/$id/name", onChange);
    db.beginTransaction();
    db.remove("users/1");
    db.push("users", { name: "garni2" });
    db.commit();
    assertEquals(onChange.calls.length, 1);
    assertEquals(onChange.calls[0].args[0].oldData, "garni");
    assertEquals(onChange.calls[0].args[0].newData, "garni2");
    assertEquals(onChange.calls[0].args[0].$id, "1");
  },
});

Deno.test({
  only: false,
  name: "[Subscriptions] .subscribe on update",
  fn: () => {
    const onChange: Spy<void> = spy(() => {});
    const db = new Store({
      initialData: { users: [{ name: "garn" }, { name: "garni" }] },
    });
    db.subscribe("users/0/name", onChange);
    db.set("users/0/name", "garn2");
    assertEquals(onChange.calls.length, 1);
    assertEquals(onChange.calls[0].args[0].oldData, "garn");
    assertEquals(onChange.calls[0].args[0].newData, "garn2");
  },
});

Deno.test({
  only: false,
  name: "[Subscriptions] .subscribe with _as",
  fn: () => {
    const onChange: Spy<void> = spy(() => {});
    const db = new Store({
      rules: {
        users: {
          $i: {
            _read: () => true,
            _write: () => true,
            _as: ({ data }) => {
              return (data && ({ ...data, hola: "mundo" }));
            },
          },
        },
      },
      initialData: { users: [{ name: "garn" }] },
    });
    db.subscribe("users/$i", onChange);

    db.push("users", { name: "garni" });
    assertEquals(onChange.calls.length, 1);
    assertEquals(onChange.calls[0].args[0].oldData, undefined);
    assertEquals(onChange.calls[0].args[0].$i, "1");
    assertEquals(onChange.calls[0].args[0].newData, {
      name: "garni",
      hola: "mundo",
    });
    db.set("users/1", { name: "garni2" });

    assertEquals(onChange.calls.length, 2);
    assertEquals(onChange.calls[1].args[0].oldData, {
      name: "garni",
      hola: "mundo",
    });
    assertEquals(onChange.calls[1].args[0].$i, "1");
    assertEquals(onChange.calls[1].args[0].newData, {
      name: "garni2",
      hola: "mundo",
    });
  },
});

Deno.test({
  only: false,
  name: "[Subscriptions] .subscribe watch for created",
  fn: () => {
    const onChange: Spy<void> = spy(({ newData, oldData }) => {
      assertEquals(!!newData && !oldData, true);
    });
    const db = new Store({
      initialData: { users: [{ name: "garn" }] },
    });
    db.subscribe("users/$id", onChange);
    // create
    db.push("users", { name: "garn2" });
    assertEquals(onChange.calls.length, 1);
  },
});
Deno.test({
  only: false,
  name: "[Subscriptions] .subscribe watch for updated",
  fn: () => {
    const onChange: Spy<void> = spy(({ newData, oldData }) => {
      assertEquals(!!newData && !!oldData, true);
    });
    const db = new Store({
      initialData: { users: [{ name: "garn" }] },
    });
    db.subscribe("users/$id", onChange);
    // update
    db.set("users/0/name", "garn2");
    assertEquals(onChange.calls.length, 1);
  },
});

Deno.test({
  only: false,
  name: "[Subscriptions] .subscribe watch for removed",
  fn: () => {
    const onChange: Spy<void> = spy(({ newData, oldData }) => {
      assertEquals(!newData && !!oldData, true);
    });
    const db = new Store({
      initialData: { users: [{ name: "garn" }] },
    });
    db.subscribe("users/$id", onChange);
    // remove
    db.remove("users/0");
    assertEquals(onChange.calls.length, 1);
  },
});
Deno.test({
  only: false,
  name: "[Subscriptions] subscription fails running callback",
  fn: () => {
    const db = new Store({
      initialData: { users: [{ name: "garn" }] },
    });
    db.subscribe("users/$id", () => {
      throw new Error("ups");
    });
    // remove
    db.remove("users/0");
    assertEquals(db.get("users"), []);
  },
});
