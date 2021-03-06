import { PermissionError } from "../Errors.ts";
import { Store } from "../Store.ts";
import { StoreJson } from "../StoreJson.ts";
import { assertEquals, assertThrows } from "./test_deps.ts";

Deno.test("[Rules _read] basic", () => {
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
  assertThrows(
    () => db.get("readForbidden/a/b/c"),
    PermissionError,
    "/readForbidden",
  );

  assertThrows(
    () => db.get("readForbidden"),
    PermissionError,
    "/readForbidden",
  );
  assertThrows(() => db.get(""), PermissionError, "explicit");
});

Deno.test("[Rules _red] do not allow if not explicit", () => {
  const rules = {};
  const db = new Store({ rules });
  assertThrows(() => db.set("a", 1), PermissionError, "explicit");
  assertThrows(() => db.get("a"), PermissionError, "explicit");
});

Deno.test("[Rules _read] root", () => {
  const rules = {
    _read: () => false,
  };
  const db = new Store({ rules });
  assertThrows(
    () => db.get(""),
    PermissionError,
    "read disallowed at path /",
  );

  assertThrows(
    () => db.get("b"),
    PermissionError,
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
  assertEquals(db.get("a/z"), undefined);
  assertThrows(() => db.get("c"));
  assertThrows(() => db.get("b"));
});

Deno.test(
  "[Rules _read] permission rules cascade",
  () => {
    const rules = {
      _read: () => true,
      _write: () => true,
      a: { _read: () => false, _write: () => false },
    };
    const db = new Store({ rules, initialData: { a: 1 } });
    assertEquals(db.get(""), { a: 1 });
    assertEquals(db.get("a"), 1);
    assertEquals(
      db.set("a", 2),
      2,
    );
  },
);

Deno.test("[Rules _read] with find", () => {
  const rules = {
    arr: { _read: () => false },
  };
  const db = new StoreJson({
    rules,
    name: "./test.json",
  });

  assertThrows(() => db.find("", () => true));
  assertThrows(() => db.find("arr", () => true));
  assertThrows(() => db.find("arr/0", () => true));
});

Deno.test("[Rules _read] with findAndRemove", () => {
  const rules = {
    arr: { _read: () => false },
  };
  const db = new StoreJson({
    rules,
    name: "./test.json",
  });

  assertThrows(() => db.find("", () => true), PermissionError, "explicit");
  assertThrows(() => db.find("arr", () => true), PermissionError, "/arr");
  assertThrows(
    () => db.find("arr/0", () => true),
    TypeError,
    "Object or Array",
  );
});

Deno.test("[Rules _read] with findOne", () => {
  const rules = {
    arr: { _read: () => false },
  };
  const db = new StoreJson({
    rules,
    name: "./test.json",
  });

  assertThrows(
    () => db.findOne("", () => true),
    PermissionError,
    "/arr",
  );
  assertThrows(() => db.findOne("arr", () => true), PermissionError, "/arr");
  assertThrows(
    () => db.findOne("arr/0", () => true),
    TypeError,
    "Object or Array",
  );
});

Deno.test("[Rules _read] with findOneAndRemove", () => {
  const rules = {
    arr: { _read: () => false },
  };
  const db = new StoreJson({
    rules,
    name: "./test.json",
  });
  assertThrows(() => db.findOneAndRemove("", () => true));
  assertThrows(() => db.findOneAndRemove("arr", () => true));
  assertThrows(() => db.findOneAndRemove("arr/0", () => true));
});

Deno.test("[Rules _read]  findOne with one child not allowed", () => {
  const rules = {
    arr: {
      "0": {
        _read: () => false,
      },
    },
  };
  const db = new StoreJson({
    rules,
    name: "./test.json",
  });

  assertThrows(
    () => db.findOne("arr", () => true),
    PermissionError,
    "/arr/0",
  );
});

Deno.test("[Rules _read] throwing custom error", () => {
  const rules = {
    _read() {
      throw new EvalError("custom error");
    },
  };
  const db = new Store({ rules });
  assertThrows(() => db.get("a"), EvalError, "custom error");
});
