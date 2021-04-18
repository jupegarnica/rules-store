import { Store } from "../src/Store.ts";
import { assertEquals, assertThrows } from "./test_deps.ts";
import type { RuleContext } from "../src/types.ts";

Deno.test("[Rules context] _write newData", () => {
  let calls = 0;
  const rules = {
    people: {
      $name: {
        _write({ newData }: RuleContext) {
          calls++;
          return (
            typeof newData === "object" && newData && newData.age > 0
          );
        },
      },
    },
  };
  const db = new Store({ rules });
  db.set("people", { garn: { age: 1 }, pepe: { age: 2 } });
  assertEquals(calls, 0); // don't throw because it sets on parent
  assertEquals(db.get("people.garn.age"), 1);
  assertEquals(db.get("people.pepe.age"), 2);
  assertThrows(() => db.set("people.garn", { age: 0 }));
  assertEquals(calls, 1);
});

Deno.test("[Rules context] _write newData", () => {
  const rules = {
    people: {
      _write({ newData }: RuleContext) {
        return typeof newData === "object" && newData;
      },
    },
  };
  const db = new Store({ rules });
  db.set("people", { garn: { age: 1 }, pepe: { age: 2 } });
  assertEquals(db.get("people.garn.age"), 1);
  assertEquals(db.get("people.pepe.age"), 2);
});

Deno.test("[Rules context] _read depending the data", () => {
  const rules = {
    a: { _read: (context: RuleContext) => context.data.b === 1 },
  };
  const db = new Store({ rules });
  db.set("a.b", 1);
  assertEquals(db.get("a.b"), 1);
  db.set("a.b", 2);
  assertThrows(() => db.get("a.b"));
});

Deno.test("[Rules context] params _read", () => {
  let calls = 0;

  const rules = {
    people: {
      $name: {
        _read: (context: RuleContext) => {
          calls++;
          assertEquals(typeof context.data, "object");
          assertEquals(typeof context.data.age, "number");
          return calls === 1;
        },
      },
    },
  };
  const db = new Store({ rules });
  db.set("people", { garn: { age: 1 }, pepe: { age: 2 } });
  assertEquals(db.get("people.garn.age"), 1);
  assertEquals(calls, 1);
  assertThrows(
    () => db.get("people.pepe.age"),
    Error,
    "read disallowed",
  );
});

Deno.test("[Rules context] params _read at root", () => {
  const rules = {
    $rootKey: {
      _read({ params, data }: RuleContext) {
        return (
          params.rootKey === "people" &&
          typeof data === "object" &&
          data
        );
      },
    },
  };
  const db = new Store({ rules });
  db.set("people", { garn: { age: 1 }, pepe: { age: 2 } });
  assertEquals(db.get("people.garn.age"), 1);
  assertThrows(
    () => db.get("clients.garn.age"),
    Error,
    "/clients",
  );
});

Deno.test("[Rules context] params _write at root", () => {
  const rules = {
    $rootKey: {
      _write({ params }: RuleContext) {
        return params.rootKey === "people";
      },
    },
  };
  const db = new Store({ rules });
  db.set("people", { garn: { age: 1 }, pepe: { age: 2 } });
  assertThrows(() => db.set("clients", { pepe: { age: 2 } }));
});

Deno.test("[Rules context] params multiple params", () => {
  let calls = 0;
  const rules = {
    $a: {
      $b: {
        $c: {
          _write({ params }: RuleContext) {
            calls++;
            return params.a === "a" && params.b === "b" && params.c === "c";
          },
        },
      },
    },
  };
  const db = new Store({ rules });
  db.set("a.b.c", 1);
  assertEquals(calls, 1);
  assertThrows(() => db.set("x.y.z", 1));
  assertEquals(calls, 2);
});
