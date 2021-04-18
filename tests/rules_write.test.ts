import { Store } from "../src/Store.ts";
import { StoreYaml } from "../src/StoreYaml.ts";
import { StoreJson } from "../src/StoreJson.ts";
import { assertEquals, assertThrows } from "./test_deps.ts";
import { RuleContext } from "../src/types.ts";

Deno.test("[Rules _write] .set", () => {
  const rules = {
    allowed: {
      _write: () => true,
    },
    forbidden: {
      _write: () => false,
    },
  };
  const db = new Store({ rules });
  const A = db.set("allowed", true);
  assertEquals(A, true);

  assertThrows(() => {
    db.set("forbidden", true);
  });
  assertThrows(() => {
    db.set("forbidden.a.b.c", true);
  });
});

Deno.test("[Rules _write] .push", () => {
  const rules = {
    arr: {
      _write: () => false,
    },
  };
  const db = new StoreYaml({
    rules,
    filename: "./tests/test.json",
  });

  assertThrows(() => {
    db.push("arr", true);
  });
});

Deno.test("[Rules _write] .remove", () => {
  const rules = {
    arr: {
      _write: () => false,
    },
  };
  const db = new StoreYaml({
    rules,
    filename: "./tests/test.yaml",
  });

  assertThrows(() => {
    db.remove("arr");
  });
});

Deno.test("[Rules _write] true but _read false ", () => {
  const rules = {
    arr: {
      _write: () => true,
      _read: () => false,
    },
  };
  const db = new StoreYaml({
    rules,
    filename: "./tests/test.yaml",
  });

  assertThrows(() => {
    db.remove("arr.0");
  });
});

Deno.test("[Rules _write] with findOneAndRemove", () => {
  const rules = {
    arr: { _write: () => false },
  };
  const db = new StoreJson({
    rules,
    filename: "./tests/test.json",
  });

  //  throw,  key 0 is not a object or array
  assertThrows(() => db.findOneAndRemove("arr.0", () => true));
  assertThrows(() => db.findOneAndRemove("arr", () => true));
  assertThrows(() => db.findOneAndRemove("", () => true));
});

Deno.test("[Rules _write] newData", () => {
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

Deno.test("[Rules _write] newData", () => {
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

Deno.test("[Rules _write] throwing custom error", () => {
  const rules = {
    _write() {
      throw new TypeError("custom error");
    },
  };
  const db = new Store({ rules });
  assertThrows(() => db.set("a", 1), TypeError, "custom error");
});
