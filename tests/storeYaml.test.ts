import { StoreYaml } from "../src/StoreYaml.ts";
import { existsSync } from "../src/deps.ts";
import { assertEquals, assertThrows, delay } from "./test_deps.ts";
const testStorePath = "../test.store.yaml";

// Persistance StoreYaml
////////////////////////

Deno.test("[StoreYaml] Write DB", async () => {
  const db = new StoreYaml({ filename: testStorePath });

  db.set("number", 5);
  assertEquals(db.get("number"), 5);

  db.write();

  assertEquals(existsSync(db.storePath), true);

  await Deno.remove(db.storePath);
});

Deno.test("[StoreYaml] load DB with filename", () => {
  const db = new StoreYaml({
    filename: "./tests/test.json",
  });

  assertEquals(db.get("arr.0"), 1);
  assertEquals(db.get("arr.1"), 2);
  assertEquals(db.get("obj.a"), 1);

  assertEquals(existsSync(db.storePath), true);
});

Deno.test("[StoreYaml] load DB with folder", () => {
  const db = new StoreYaml({
    filename: "test.json",
    folder: "./tests",
  });

  assertEquals(db.get("arr.0"), 1);
  assertEquals(db.get("arr.1"), 2);
  assertEquals(db.get("obj.a"), 1);

  assertEquals(existsSync(db.storePath), true);
});
Deno.test("[StoreYaml] DB write and delete store", () => {
  const db = new StoreYaml({ filename: testStorePath });

  db.set("number5", 5);
  db.set("number10", 10);

  db.write();

  const db2 = new StoreYaml({ filename: testStorePath });

  assertEquals(db2.get("number5"), 5);

  assertEquals(existsSync(db.storePath), true);

  db.deleteStore();
  assertThrows(() => {
    db2.deleteStore();
  });

  const exists = existsSync(db.storePath);
  assertEquals(exists, false);
});

Deno.test("[StoreYaml] autoSave config on set", async () => {
  const db = new StoreYaml({ filename: testStorePath, autoSave: true });
  db.set("number5", 5);
  await delay(2);
  assertEquals(existsSync(db.storePath), true);
  db.deleteStore();
  assertEquals(existsSync(db.storePath), false);
});

Deno.test("[StoreYaml] autoSave config on push", async () => {
  const db = new StoreYaml({ filename: testStorePath, autoSave: true });
  db.set("arr", []);
  db.push("arr", 1, 2);
  await delay(2);

  assertEquals(existsSync(db.storePath), true);
  db.deleteStore();
  assertEquals(existsSync(db.storePath), false);
});
Deno.test("[StoreYaml] autoSave config on remove", async () => {
  const db = new StoreYaml({ filename: testStorePath, autoSave: true });
  db.set("arr", [1, 2]);
  db.remove("arr.0");
  await delay(2);
  assertEquals(existsSync(db.storePath), true);
  db.deleteStore();
  assertEquals(existsSync(db.storePath), false);
});

Deno.test("[StoreYaml] set and get null", () => {
  const db = new StoreYaml();
  db.set("a.b.c", null);
  assertEquals(db.get("a.b.c"), null);
  db.write();
  db.load();
  assertEquals(db.get("a.b.c"), null);
  db.deleteStore();
});
