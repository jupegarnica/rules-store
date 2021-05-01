import { PermissionError } from "../src/Errors.ts";
import { Store } from "../src/Store.ts";
import { Observer, Value } from "../src/types.ts";
import { assertEquals, assertThrows, spy } from "./test_deps.ts";
import type { Spy } from "./test_deps.ts";
import { testCalled } from "../src/helpers.ts";

Deno.test("[Observe]", () => {
  const db = new Store();

  db.set("A", 0);
  let called = 0;
  const onChange: Observer = ({ newData }) => {
    called++;
    assertEquals(newData, called);
  };
  const id = db.observe("A", onChange);

  assertEquals(id, 1);
  assertEquals(called, 0);

  db.set("A", 1);
  assertEquals(called, 1);

  db.set("A", 2);
  assertEquals(called, 2);
});

Deno.test("[Observe] assert payload", () => {
  const db = new Store();

  db.set("A", 0);
  let called = 0;
  const onChange: Observer = ({ newData, oldData }) => {
    called++;
    assertEquals(newData, 1);
    assertEquals(oldData, 0);
  };

  const id = db.observe("A", onChange);
  assertEquals(id, 1);
  assertEquals(called, 0);

  db.set("A", 1);
  assertEquals(called, 1);
});

Deno.test("[Observe] assert payload isUpdated, isCreated and isDeleted", () => {
  const db = new Store();
  const onChange: Spy<void> = spy();

  db.observe("a", onChange);
  db.set("a", 0);
  assertEquals(onChange.calls[0].args[0].isCreated, true);
  assertEquals(onChange.calls[0].args[0].isUpdated, false);
  assertEquals(onChange.calls[0].args[0].isDeleted, false);

  db.set("a", 1);
  assertEquals(onChange.calls[1].args[0].isCreated, false);
  assertEquals(onChange.calls[1].args[0].isUpdated, true);
  assertEquals(onChange.calls[1].args[0].isDeleted, false);

  db.remove("a");
  assertEquals(onChange.calls[2].args[0].isCreated, false);
  assertEquals(onChange.calls[2].args[0].isDeleted, true);
  assertEquals(onChange.calls[2].args[0].isUpdated, false);
});

Deno.test("[Observe] assert payload inmutable", () => {
  const db = new Store();

  db.set("a", { b: 0 });
  let called = 0;
  const onChange: Observer = ({ newData, oldData }) => {
    called++;
    newData.b = 2;
    oldData.b = 3;
  };

  const id = db.observe("a", onChange);
  assertEquals(id, 1);
  assertEquals(called, 0);

  db.set("a.b", 1);
  assertEquals(called, 1);
  assertEquals(db.get("a"), { b: 1 });
});
Deno.test("[Observe] root throws", () => {
  const db = new Store();
  assertThrows(() => db.observe("", () => {}), Error, "Root");
});

Deno.test("[Observe] checks read rule", () => {
  const db = new Store({
    rules: {
      _read: () => true,
      a: {
        _read: () => false,
      },
    },
  });
  assertThrows(() => db.observe("a", () => {}), PermissionError, "read");
});

Deno.test({
  // only: true,
  name: "[Observe] checks read dynamic rule ",
  fn: () => {
    const mock: Spy<Console> = spy(console, "warn");
    const db = new Store({
      rules: {
        a: {
          _read: (data: Value) => {
            return data <= 1;
          },
          _write: () => true,
        },
      },
      initialData: { a: 0 },
    });
    let calls = 0;
    const onChange: Observer = () => {
      calls++;
    };
    db.observe("a", onChange);
    db.set("a", 1);
    assertEquals(calls, 1);
    db.set("a", 2);
    assertEquals(calls, 1); // no called
    assertEquals(mock.calls.length, 1); // called console.warn
  },
});

Deno.test("[Observe] with deeper set", () => {
  const db = new Store();
  db.set("a.b", { c: 0, d: 0 });

  let called = 0;
  const onChange: Observer = ({ newData }) => {
    called++;
    assertEquals(newData.c, 1);
  };
  db.observe("a.b", onChange);

  assertEquals(called, 0);
  db.set("a.b.c", 1);
  assertEquals(called, 1);
  db.set("a.b.d", 2);
  assertEquals(called, 2);
});
Deno.test("[Observe]", () => {
  const db = new Store();

  db.set("A", 1);
  let called = 0;
  const onChange: Observer = ({ newData }) => {
    called++;
    assertEquals(newData, called + 1);
  };
  const returned = db.observe("A", onChange);

  assertEquals(returned, 1);
  assertEquals(called, 0);

  db.set("A", 2);
  assertEquals(called, 1);

  db.set("A", 3);
  assertEquals(called, 2);
});

Deno.test("[Observe] .off", () => {
  const db = new Store();

  db.set("A", 1);

  let called = false;
  const onChange: Observer = ({ newData }) => {
    called = true;
    assertEquals(newData, 1);
  };

  const id = db.observe("A", onChange);
  assertEquals(called, false);
  assertEquals(db.off(id), true);
  assertEquals(called, false);
  db.set("A", 3); // should not call onChange
  assertEquals(called, false);
  assertEquals(db.off(id), false);
});

Deno.test("[Observe] Deep basic ", () => {
  const db = new Store();
  db.set("a.b.c", true);

  let called = false;
  const onChangeC: Observer = ({ newData }) => {
    called = true;
    assertEquals(newData, true);
  };
  const id = db.observe("a.b.c", onChangeC);
  assertEquals(id, 1);
  assertEquals(called, false);
});

Deno.test("[Observe] assert newData and oldData", () => {
  const db = new Store();
  db.set("a.b.c", true);
  const onChange: Spy<void> = spy(({ newData, oldData }) => ({
    newData,
    oldData,
  }));

  db.observe("a.b", onChange);

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

Deno.test("[Observe] assert newData and oldData cloned", () => {
  const db = new Store();
  db.set("a.b.c", true);
  const mock: Spy<typeof testCalled> = spy(testCalled, "noop");

  db.observe("a.b", ({ newData, oldData }) => ({
    newData,
    oldData,
  }));
  db.set("a.b.c", 33);
  assertEquals(mock.calls.length, 2);
  mock.restore();
});

Deno.test("[Observe] assert newData cloned", () => {
  const db = new Store();
  db.set("a.b.c", true);
  const mock: Spy<typeof testCalled> = spy(testCalled, "noop");

  db.observe("a.b", ({ newData }) => ({
    newData,
  }));
  db.set("a.b.c", 33);
  assertEquals(mock.calls.length, 1);
  mock.restore();
});

Deno.test("[Observe] inmutable callback", () => {
  const db = new Store();
  db.set("a.b.c", 0);

  let called = 0;
  const onChange = ({ newData }: Value) => {
    called++;
    assertEquals(newData, { c: 1 });
    newData.c = 2;
    assertEquals(newData, { c: 2 });
  };
  db.observe("a.b", onChange);

  assertEquals(called, 0);
  db.set("a.b.c", 1);
  assertEquals(called, 1);
  assertEquals(db.get("a.b.c"), 1);
});

Deno.test("[Observe] Deep remove with subscription", () => {
  const db = new Store();
  db.set("a.b.c", 1);

  let called = 0;
  const onChange: Observer = ({ newData, oldData }) => {
    called++;
    assertEquals(newData, undefined);
    assertEquals(oldData, 1);
  };
  db.observe("a.b.c", onChange);

  assertEquals(called, 0);

  const B = db.remove("a.b");
  assertEquals(called, 1);

  assertEquals(B, { c: 1 });
  assertEquals(db.get("a.b.c"), undefined);
});

Deno.test("[Observe] with params", () => {
  const onChange: Spy<void> = spy();
  const db = new Store();
  db.observe("$x", onChange);
  db.set("a", 1);
  assertEquals(onChange.calls.length, 1);
});

Deno.test("[Observe] with params args", () => {
  const onChange: Spy<void> = spy();
  const db = new Store();
  db.observe("$x", onChange);
  db.set("a", 1);
  assertEquals(onChange.calls[0].args[0].oldData, undefined);
  assertEquals(onChange.calls[0].args[0].newData, 1);
  assertEquals(onChange.calls[0].args[0].$x, "a");
});

Deno.test("[Observe] with params args", () => {
  const onChange: Spy<void> = spy();
  const db = new Store();
  db.observe("a/$x", onChange);
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
  name: "[Observe] with params args push",
  fn: () => {
    const onChange: Spy<void> = spy(() => {});
    const db = new Store({
      initialData: { users: [] },
    });
    db.observe("users/$id/name", onChange);

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
  name: "[Observe] with params args remove",
  fn: () => {
    const onChange: Spy<void> = spy(() => {});
    const db = new Store({
      initialData: { users: [{ name: "garn" }, { name: "garni" }] },
    });
    db.observe("users/$id/name", onChange);

    db.remove("users/0");
    assertEquals(onChange.calls.length, 1);
    assertEquals(onChange.calls[0].args[0].oldData, "garn");
    assertEquals(onChange.calls[0].args[0].newData, undefined);
    assertEquals(onChange.calls[0].args[0].$id, "0");
  },
});

Deno.test({
  only: false,
  name: "[Observe] on transaction",
  fn: () => {
    const onChange: Spy<void> = spy(() => {});
    const db = new Store({
      initialData: { users: [{ name: "garn" }, { name: "garni" }] },
    });
    db.observe("users/$id/name", onChange);
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
  name: "[Observe] on transaction",
  fn: () => {
    const onChange: Spy<void> = spy(() => {});
    const db = new Store({
      initialData: { users: [{ name: "garn" }, { name: "garni" }] },
    });
    db.observe("users/0/name", onChange);
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
  name: "[Observe] on transaction",
  fn: () => {
    const onChange: Spy<void> = spy(() => {});
    const db = new Store({
      initialData: { users: [{ name: "garn" }, { name: "garni" }] },
    });
    db.observe("users/$id/name", onChange);
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
  name: "[Observe] on update",
  fn: () => {
    const onChange: Spy<void> = spy(() => {});
    const db = new Store({
      initialData: { users: [{ name: "garn" }, { name: "garni" }] },
    });
    db.observe("users/0/name", onChange);
    db.set("users/0/name", "garn2");
    assertEquals(onChange.calls.length, 1);
    assertEquals(onChange.calls[0].args[0].oldData, "garn");
    assertEquals(onChange.calls[0].args[0].newData, "garn2");
  },
});

Deno.test({
  // only: true,
  name: "[Observe] with _as",
  fn: () => {
    const onChange: Spy<void> = spy(() => {});
    const db = new Store({
      rules: {
        users: {
          $i: {
            _read: () => true,
            _write: () => true,
            _as: (newData) => {
              return (newData && ({ ...newData, hola: "mundo" }));
            },
          },
        },
      },
      initialData: { users: [{ name: "1" }] },
    });
    db.observe("users/$i", onChange);

    db.push("users", { name: "2" });
    assertEquals(onChange.calls.length, 1);
    assertEquals(onChange.calls[0].args[0].oldData, undefined);
    assertEquals(onChange.calls[0].args[0].$i, "1");
    assertEquals(onChange.calls[0].args[0].newData, {
      name: "2",
      hola: "mundo",
    });
    db.set("users/1", { name: "3" });

    assertEquals(onChange.calls.length, 2);
    assertEquals(onChange.calls[1].args[0].oldData, {
      name: "2",
      hola: "mundo",
    });
    assertEquals(onChange.calls[1].args[0].$i, "1");
    assertEquals(onChange.calls[1].args[0].newData, {
      name: "3",
      hola: "mundo",
    });
  },
});

Deno.test({
  // only: true,
  name: "[Observe] with _as 2",
  fn: () => {
    const onChange: Spy<void> = spy(() => {});
    const db = new Store({
      rules: {
        users: {
          $i: {
            _read: () => true,
            _write: () => true,
            _as: (newData) => {
              return (newData && ({ ...newData, hola: "mundo" }));
            },
          },
        },
      },
      initialData: { users: [{ name: "1" }] },
    });
    db.observe("users/$i", onChange);

    db.set("users/0", { name: "2" });

    assertEquals(onChange.calls.length, 1);
    assertEquals(onChange.calls[0].args[0].oldData, {
      name: "1",
      hola: "mundo",
    });
    assertEquals(onChange.calls[0].args[0].$i, "0");
    assertEquals(onChange.calls[0].args[0].newData, {
      name: "2",
      hola: "mundo",
    });
    db.set("users/0", { name: "3" });

    assertEquals(onChange.calls[1].args[0].oldData, {
      name: "2",
      hola: "mundo",
    });
    assertEquals(onChange.calls[1].args[0].newData, {
      name: "3",
      hola: "mundo",
    });
  },
});

Deno.test({
  only: false,
  name: "[Observe] watch for created",
  fn: () => {
    const onChange: Spy<void> = spy(({ newData, oldData }) => {
      assertEquals(!!newData && !oldData, true);
    });
    const db = new Store({
      initialData: { users: [{ name: "garn" }] },
    });
    db.observe("users/$id", onChange);
    // create
    db.push("users", { name: "garn2" });
    assertEquals(onChange.calls.length, 1);
  },
});
Deno.test({
  only: false,
  name: "[Observe] watch for updated",
  fn: () => {
    const onChange: Spy<void> = spy(({ newData, oldData }) => {
      assertEquals(!!newData && !!oldData, true);
    });
    const db = new Store({
      initialData: { users: [{ name: "garn" }] },
    });
    db.observe("users/$id", onChange);
    // update
    db.set("users/0/name", "garn2");
    assertEquals(onChange.calls.length, 1);
  },
});

Deno.test({
  only: false,
  name: "[Observe] watch for removed",
  fn: () => {
    const onChange: Spy<void> = spy(({ newData, oldData }) => {
      assertEquals(!newData && !!oldData, true);
    });
    const db = new Store({
      initialData: { users: [{ name: "garn" }] },
    });
    db.observe("users/$id", onChange);
    // remove
    db.remove("users/0");
    assertEquals(onChange.calls.length, 1);
  },
});
Deno.test({
  only: false,
  name: "[Observe] subscription fails running callback",
  fn: () => {
    const db = new Store({
      initialData: { users: [{ name: "garn" }] },
    });
    db.observe("users/$id", () => {
      throw new Error("ups");
    });
    // remove
    db.remove("users/0");
    assertEquals(db.get("users"), []);
  },
});
