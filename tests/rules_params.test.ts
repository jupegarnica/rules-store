import { findRuleAndParams } from "../src/helpers.ts";
import { Store } from "../src/Store.ts";
import { RuleContext } from "../src/types.ts";
import { assertEquals, assertThrows } from "./test_deps.ts";

const context = { data: "bar", params: {}, newData: undefined };

Deno.test("[Rules params] _read", () => {
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

Deno.test("[Rules params] _read at root", () => {
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

Deno.test("[Rules params] _write at root", () => {
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

// TODO more integration tests:  with _write and more cases

Deno.test("[Rules params] findRuleAndParams basic", () => {
  const rules = {
    people: {
      $name: {
        _read: () => true,
      },
    },
  };
  const found = findRuleAndParams(
    ["people", "garn", "age"],
    "_read",
    rules,
  );

  assertEquals(found.params.name, "garn");
  assertEquals(found._read?.(context), true);
});

Deno.test("[Rules params] findRuleAndParams not found", () => {
  const rules = {
    people: {
      $name: {
        _read: () => true,
      },
    },
  };

  const notFound = findRuleAndParams(
    ["404", "garn", "age"],
    "_read",
    rules,
  );
  assertEquals(notFound.params, {});
  assertEquals(notFound._read, undefined);
  assertEquals(notFound, {
    params: {},
    _read: undefined,
    rulePath: [],
  });
});

Deno.test(
  "[Rules params] findRuleAndParams multiple rules",
  () => {
    const rules = {
      _read: () => 0,
      people: {
        _read: () => 1,
        $name: {
          _read: () => 2,
          age: {
            _read: () => 3,
          },
        },
      },
    };
    const found = findRuleAndParams(
      ["people", "garn", "age"],
      "_read",
      rules,
    );
    assertEquals(found._read?.(context), 3);
    assertEquals(found.params, { name: "garn" });
  },
);

Deno.test("[Rules params] findRuleAndParams root rule", () => {
  const rules = {
    _read: () => 0,
    people: {
      $name: {
        age: {
          ups: {
            _read: () => 1,
          },
        },
      },
    },
  };
  const found = findRuleAndParams(
    ["people", "garn", "age"],
    "_read",
    rules,
  );
  assertEquals(found._read?.(context), 0);
  assertEquals(found.params, { name: "garn" });
});

Deno.test("[Rules params] findRuleAndParams two ways", () => {
  const rules = {
    providers: {
      $name: {
        age: {
          _read: () => 1,
        },
      },
    },
    $foo: {
      $bar: {
        age: { _read: () => 2 },
      },
    },
  };
  const first = findRuleAndParams(
    ["providers", "garn", "age"],
    "_read",
    rules,
  );

  assertEquals(first.params, { name: "garn" });
  assertEquals(first._read?.(context), 1);
  const second = findRuleAndParams(
    ["clients", "garn", "age"],
    "_read",
    rules,
  );
  assertEquals(second.params, { foo: "clients", bar: "garn" });
  assertEquals(second._read?.(context), 2);
});
