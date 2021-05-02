import { Store } from "../src/Store.ts";
import { StoreYaml } from "../src/StoreYaml.ts";
import { StoreJson } from "../src/StoreJson.ts";
import { assertEquals, assertThrows } from "./test_deps.ts";
import { PermissionError } from "../src/Errors.ts";
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

Deno.test("[Rules _write] .remove _write true but _read false ", () => {
  const rules = {
    _read: () => true,

    arr: {
      _write: () => true,
      _read: () => false,
    },
  };
  const db = new StoreYaml({
    rules,
    filename: "./tests/test.yaml",
  });

  assertThrows(
    () => {
      db.remove("arr.0");
    },
    Error,
    "read disallow",
  );

  assertEquals(
    db.remove("arr.0", false),
    undefined,
  );
});

Deno.test("[Rules _write] with .findAndRemove _write true but _read false", () => {
  const rules = {
    arr: {
      $i: {
        _write: () => true,
        _read: () => false,
      },
    },
  };
  const db = new StoreJson({
    rules,
    filename: "./tests/test.json",
  });

  assertThrows(
    () => db.findAndRemove("arr", () => true),
    PermissionError,
    "/arr/0",
  );
});

Deno.test("[Rules _write] with .findOneAndRemove", () => {
  const rules = {
    arr: { _write: () => false },
  };
  const db = new StoreJson({
    rules,
    filename: "./tests/test.json",
  });

  assertThrows(() => db.findOneAndRemove("arr.0", () => true));
  //  throw,  key 0 is not a Object or Array
  assertThrows(
    () => db.findOneAndRemove("arr.0", () => true),
    TypeError,
    "not Object or Array",
  );
});

Deno.test("[Rules _write] with .findOneAndRemove _write true but _read false", () => {
  const rules = {
    arr: {
      $i: {
        _write: () => true,
        _read: () => false,
      },
    },
  };
  const db = new StoreJson({
    rules,
    filename: "./tests/test.json",
  });

  assertThrows(() => db.findOneAndRemove("arr", () => true));
});

Deno.test("[Rules _write] throwing custom error", () => {
  const rules = {
    _write() {
      throw new EvalError("custom error");
    },
  };
  const db = new Store({ rules });
  assertThrows(() => db.set("a", 1), EvalError, "custom error");
});

Deno.test("[Rules _write] .set(function) without read permission", () => {
  const rules = {
    _read: () => false,
    _write: () => true,
  };
  const db = new Store({ rules });
  db.set("a", 1);
  assertThrows(() => db.set("a", (val: number) => val + 1));
});
