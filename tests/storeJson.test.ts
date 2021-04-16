import { StoreJson } from "../src/StoreJson.ts";
import { existsSync } from "../src/deps.ts";
import { assertEquals, assertThrows } from "./test_deps.ts";
const testStorePath = "../test.store.json";

// Persistance StoreJson
////////////////////////

Deno.test("[StoreJson] Write DB", async () => {
  const db = new StoreJson({ filename: testStorePath });

  db.set("number", 5);
  assertEquals(db.get("number"), 5);

  db.write();

  assertEquals(existsSync(db.storePath), true);

  await Deno.remove(db.storePath);
});

Deno.test("[StoreJson] load DB with filename", () => {
  const db = new StoreJson({
    filename: "./tests/test.json",
  });

  assertEquals(db.get("arr.0"), 1);
  assertEquals(db.get("arr.1"), 2);
  assertEquals(db.get("obj.a"), 1);

  assertEquals(existsSync(db.storePath), true);
});

Deno.test("[StoreJson] load DB with folder", () => {
  const db = new StoreJson({
    filename: "test.json",
    folder: "./tests",
  });

  assertEquals(db.get("arr.0"), 1);
  assertEquals(db.get("arr.1"), 2);
  assertEquals(db.get("obj.a"), 1);

  assertEquals(existsSync(db.storePath), true);
});

Deno.test("[StoreJson] DB write and delete store", () => {
  const db = new StoreJson({ filename: testStorePath });

  db.set("number5", 5);
  db.set("number10", 10);

  db.write();

  const db2 = new StoreJson({ filename: testStorePath });

  assertEquals(db2.get("number5"), 5);

  assertEquals(existsSync(db.storePath), true);

  db.deleteStore();
  assertThrows(() => {
    db2.deleteStore();
  });

  const exists = existsSync(db.storePath);
  assertEquals(exists, false);
});

Deno.test("[StoreJson] autoSave config on set", () => {
  const db = new StoreJson({
    filename: testStorePath,
    autoSave: true,
  });
  db.set("number5", 5);

  assertEquals(existsSync(db.storePath), true);
  db.deleteStore();
  assertEquals(existsSync(db.storePath), false);
});

Deno.test("[StoreJson] autoSave config on push", () => {
  const db = new StoreJson({
    filename: testStorePath,
    autoSave: true,
  });
  db.set("arr", []);
  Deno.removeSync(testStorePath);
  db.push("arr", 1, 2);

  assertEquals(existsSync(db.storePath), true);
  db.deleteStore();
  assertEquals(existsSync(db.storePath), false);
});
Deno.test("[StoreJson] autoSave config on remove", () => {
  const db = new StoreJson({
    filename: testStorePath,
    autoSave: true,
  });
  db.set("arr", [1, 2]);
  Deno.removeSync(testStorePath);
  db.remove("arr.0");
  assertEquals(existsSync(db.storePath), true);
  db.deleteStore();
  assertEquals(existsSync(db.storePath), false);
});

Deno.test("[StoreJson] set and get null", () => {
  const db = new StoreJson();
  db.set("a.b.c", null);
  assertEquals(db.get("a.b.c"), null);
  db.write();
  db.load();
  assertEquals(db.get("a.b.c"), null);
  db.deleteStore();

});