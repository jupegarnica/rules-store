import { Store } from "../src/Store.ts";
import { assertEquals, assertThrows } from "./test_deps.ts";
import type { RuleContext } from "../src/types.ts";
import { PermissionError } from "../src/Errors.ts";

Deno.test("[Rules context] _write assert context values", () => {
  let calls = 0;
  const rules = {
    a: {
      _write({ data, newData,rootData }: RuleContext) {
        calls++;
        assertEquals(data, 0);
        assertEquals(rootData.a, 0);
        assertEquals(newData, 2);
        return true;
      },
    },
  };
  const db = new Store({ rules, initialDataIfNoFile: { a: 0 } });
  db.set("a", 2);
  assertEquals(calls, 1);
});

Deno.test("[Rules context] _write newData", () => {
  let calls = 0;
  const rules = {
    people: {
      _read: () => true,
      _write: () => true,
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
    _read: () => true,

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

Deno.test("[Rules context] newData .set and .push from different level", () => {
  let calls = 0;
  const rules = {
    myList: {
      _write: ({ newData }: RuleContext) => {
        calls++;
        return Array.isArray(newData) && newData.length === calls;
      },
    },
  };

  const db = new Store({ rules });
  const A = db.set("myList", [0]);
  assertEquals(calls, 1);
  assertEquals(A, [0]);
  db.set("myList.1", 1);
  assertEquals(calls, 2);
  db.push("myList", 2);
  assertEquals(calls, 3);
  db.push("myList", 3, 4);
  assertEquals(calls, 5);
});

Deno.test("[Rules context] newData .remove from different level", () => {
  let calls = 0;
  const rules = {
    _read: () => true,

    myList: {
      _write: ({ newData }: RuleContext) => {
        calls++;
        return Array.isArray(newData) && newData.length === calls;
      },
    },
  };

  const db = new Store({ rules });
  const A = db.set("myList", [0]);
  assertEquals(calls, 1);
  assertEquals(A, [0]);
  db.push("myList", 1);
  calls--;
  calls--;
  db.remove("myList.1");
  assertEquals(db.get("myList"), [0]);
});

Deno.test("[Rules context] _read depending the data", () => {
  const rules = {
    _write: () => true,
    a: { _read: (context: RuleContext) => context.data.b === 1 },
  };
  const db = new Store({ rules });
  db.set("a.b", 1);
  assertEquals(db.get("a.b"), 1);
  // db.set("a.b", 2);
  // assertThrows(() => db.get("a.b"));
});

Deno.test("[Rules context] params _read", () => {
  let calls = 0;

  const rules = {
    _write: () => true,
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
    PermissionError,
    "read disallowed",
  );
});

Deno.test("[Rules context] params _read at root", () => {
  const rules = {
    _write: () => true,
    $rootKey: {
      _read({ $rootKey, data }: RuleContext) {
        return (
          $rootKey === "people" &&
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
    PermissionError,
    "/clients",
  );
});

Deno.test("[Rules context] params _write at root", () => {
  const rules = {
    $rootKey: {
      _write({ $rootKey }: RuleContext) {
        return $rootKey === "people";
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
    _write: () => true,
    $a: {
      $b: {
        $c: {
          _write({ $a, $b, $c }: RuleContext) {
            calls++;
            return $a === "a" && $b === "b" && $c === "c";
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

Deno.test("[Rules context] rootData", () => {
  let calls = 0;
  const rules = {
    _write: () => true,
    $a: {
      $b: {
        _read({ rootData }: RuleContext) {
          calls++;
          assertEquals(rootData, { a: { b: 1 } });
          return true;
        },
      },
    },
  };
  const db = new Store({ rules });
  db.set("a.b", 1);
  db.get("x.y.z");
  assertEquals(calls, 1);

  db.get("w.x.y.z");
  assertEquals(calls, 2);
});
