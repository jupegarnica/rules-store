import { StoreJson } from "../core/StoreJson.ts";
import { existsSync } from "../core/deps.ts";
import { assertEquals, assertThrows, delay } from "./test_deps.ts";
const testStorePath = "./tests/test.store.json";

// Persistance StoreJson
////////////////////////

Deno.test({
  // only: true,
  name: "[StoreJson] Write DB",
  fn: async () => {
    const db = new StoreJson({ name: testStorePath });

    db.set("number", 5);
    assertEquals(db.get("number"), 5);

    db.write();

    assertEquals(existsSync(db.storePath), true);

    await Deno.remove(db.storePath);
  },
});

Deno.test("[StoreJson] load DB with name", () => {
  const db = new StoreJson({
    name: "./tests/test.json",
  });

  assertEquals(db.get("arr.0"), 1);
  assertEquals(db.get("arr.1"), 2);
  assertEquals(db.get("obj.a"), 1);

  assertEquals(existsSync(db.storePath), true);
});

Deno.test("[StoreJson] load DB with folder", () => {
  const db = new StoreJson({
    name: "test.json",
    folder: "./tests",
  });

  assertEquals(db.get("arr.0"), 1);
  assertEquals(db.get("arr.1"), 2);
  assertEquals(db.get("obj.a"), 1);

  assertEquals(existsSync(db.storePath), true);
});

Deno.test("[StoreJson] DB write and delete store", () => {
  const db = new StoreJson({ name: testStorePath });

  db.set("number5", 5);
  db.set("number10", 10);

  db.write();

  const db2 = new StoreJson({ name: testStorePath });

  assertEquals(db2.get("number5"), 5);

  assertEquals(existsSync(db.storePath), true);

  db.deleteStore();
  assertThrows(() => {
    db2.deleteStore();
  });

  const exists = existsSync(db.storePath);
  assertEquals(exists, false);
});

Deno.test("[StoreJson] autoSave config on set", async () => {
  const db = new StoreJson({
    name: testStorePath,
    autoSave: true,
  });
  db.set("number5", 5);
  await delay(5);
  assertEquals(existsSync(db.storePath), true);
  db.deleteStore();
  assertEquals(existsSync(db.storePath), false);
});

Deno.test("[StoreJson] autoSave config on push", async () => {
  const db = new StoreJson({
    name: testStorePath,
    autoSave: true,
  });
  db.set("arr", []);
  db.push("arr", 1, 2);
  await delay(5);
  assertEquals(existsSync(db.storePath), true);
  db.deleteStore();
  assertEquals(existsSync(db.storePath), false);
});
Deno.test("[StoreJson] autoSave config on remove", async () => {
  const db = new StoreJson({
    name: testStorePath,
    autoSave: true,
  });
  db.set("arr", [1, 2]);
  db.remove("arr.0");
  await delay(5);

  assertEquals(existsSync(db.storePath), true);
  db.deleteStore();
  assertEquals(existsSync(db.storePath), false);
});

Deno.test("[StoreJson] autoSave config on findAndRemove", async () => {
  const db = new StoreJson({
    name: testStorePath,
    autoSave: true,
  });
  db.set("arr", [1, 2]);
  db.findAndRemove("arr", () => true);
  await delay(5);
  assertEquals(existsSync(db.storePath), true);
  db.deleteStore();
  assertEquals(existsSync(db.storePath), false);
});
Deno.test("[StoreJson] autoSave config on findOneAndRemove", async () => {
  const db = new StoreJson({
    name: testStorePath,
    autoSave: true,
  });
  db.set("arr", [1, 2]);
  db.findOneAndRemove("arr", () => true);
  await delay(5);
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
