import { Store } from "../src/Store.ts";
import { StoreJson } from "../src/StoreJson.ts";
import { assertEquals, assertThrows } from "./test_deps.ts";

Deno.test("[Rules _red]", () => {
  const rules = {
    readAllowed: {
      _read: () => true,
    },
    readForbidden: {
      _read: () => false,
    },
  };
  const db = new Store({ rules });
  const A = db.get("readAllowed");
  assertEquals(A, undefined);
  assertThrows(() => db.get("readForbidden.a.b.c"));
});

Deno.test("[Rules _red] do not allow if not explicit", () => {
  const rules = {};
  const db = new Store({ rules });
  assertThrows(() => db.set("a",1));
  assertThrows(() => db.get("a"));
});

Deno.test("[Rules _read] root", () => {
  const rules = {
    _read: () => false,
  };
  const db = new Store({ rules });
  assertThrows(
    () => db.get("a"),
    Error,
    "read disallowed at path /",
  );

  assertThrows(
    () => db.get("b"),
    Error,
    "read disallowed at path /",
  );
});

Deno.test("[Rules _read] overlapping rules", () => {
  const rules = {
    _read: () => false,
    a: { _read: () => true },
  };
  const db = new Store({ rules });

  assertEquals(db.get("a"), undefined);
  assertEquals(db.get("a.z"), undefined);
  assertThrows(() => db.get("c"));
  assertThrows(() => db.get("b"));
});

Deno.test("[Rules _read] overlapping rules", () => {
  const rules = {
    _read: () => true,
    a: { _read: () => false },
  };
  const db = new Store({ rules });

  assertEquals(db.get("b"), undefined);

  assertThrows(
    () => db.get("a"),
    Error,
    "read disallowed at path /a",
  );
  assertThrows(
    () => db.get("a.b"),
    Error,
    "read disallowed at path /a",
  );
});

Deno.test(
  "[Rules _read] access protected data from parent",
  () => {
    const rules = {
      // _read: () => true,
      a: { _read: () => false },
    };
    const db = new Store({ rules });
    db.set("a", 1);
    assertEquals(db.get(""), { a: 1 });

    assertThrows(
      () => db.get("a"),
      Error,
      "read disallowed at path /a",
    );
  },
);

Deno.test("[Rules _read] protecting the root", () => {
  const rules = {
    _read: () => false,
    a: { _read: () => false },
  };
  const db = new Store({ rules });
  // db.set("a", 1);

  assertThrows(
    () => assertEquals(db.get(""), { a: 1 }),
    Error,
    "read disallowed at path /",
  );
});

Deno.test("[Rules _read] with find", () => {
  const rules = {
    arr: { _read: () => false },
  };
  const db = new StoreJson({
    rules,
    filename: "./tests/test.json",
  });

  assertThrows(() => db.find("", () => true));
  assertThrows(() => db.find("arr", () => true));
  assertThrows(() => db.find("arr.0", () => true));
});

Deno.test("[Rules _read] with findAndRemove", () => {
  const rules = {
    arr: { _read: () => false },
  };
  const db = new StoreJson({
    rules,
    filename: "./tests/test.json",
  });

  assertThrows(() => db.find("", () => true));
  assertThrows(() => db.find("arr", () => true));
  assertThrows(() => db.find("arr.0", () => true));
});

Deno.test("[Rules _read] with findOne", () => {
  const rules = {
    arr: { _read: () => false },
  };
  const db = new StoreJson({
    rules,
    filename: "./tests/test.json",
  });

  assertThrows(() => db.findOne("", () => true), Error, "/arr");
  assertThrows(() => db.findOne("arr", () => true));
  assertThrows(() => db.findOne("arr.0", () => true));
});

Deno.test("[Rules _read] with findOneAndRemove", () => {
  const rules = {
    arr: { _read: () => false },
  };
  const db = new StoreJson({
    rules,
    filename: "./tests/test.json",
  });
  assertThrows(() => db.findOneAndRemove("", () => true));
  assertThrows(() => db.findOneAndRemove("arr", () => true));
  assertThrows(() => db.findOneAndRemove("arr.0", () => true));
});

Deno.test("[Rules _read] find with one child not allowed", () => {
  const rules = {
    arr: { _read: () => true, "1": { _read: () => false } },
  };
  const db = new StoreJson({
    rules,
    filename: "./tests/test.json",
  });

  assertThrows(
    () => db.find("arr", () => true),
    Error,
    "/arr/1",
  );
});

Deno.test("[Rules _read]  findOn with one child not allowed", () => {
  const rules = {
    arr: { _read: () => true, "0": { _read: () => false } },
  };
  const db = new StoreJson({
    rules,
    filename: "./tests/test.json",
  });

  assertThrows(
    () => db.findOne("arr", () => true),
    Error,
    "/arr/0",
  );
});

Deno.test("[Rules _read] throwing custom error", () => {
  const rules = {
    _read() {
      throw new TypeError("custom error");
    },
  };
  const db = new Store({ rules });
  assertThrows(() => db.get("a"), TypeError, "custom error");
});
