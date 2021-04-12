import { StoreJson } from "../src/StoreJson.ts";
import { existsSync } from "../src/deps.ts";
import { assertEquals, assertThrows } from "./test_deps.ts";
const testStorePath = "../test.store.json";

// Persistance StoreJson
////////////////////////
Deno.test("[StoreJson] Empty DB should not be persisted", () => {
  const db = new StoreJson("./not-exiting.json");
  db.write();

  assertEquals(existsSync(db.storePath), false);
});

Deno.test("[StoreJson] Write DB", async () => {
  const db = new StoreJson(testStorePath);

  db.set("number", 5);
  assertEquals(db.get("number"), 5);

  db.write();

  assertEquals(existsSync(db.storePath), true);

  await Deno.remove(db.storePath);
});

Deno.test("[StoreJson] DB load / write / delete store", () => {
  const db = new StoreJson(testStorePath);

  db.set("number5", 5);
  db.set("number10", 10);

  db.write(testStorePath);

  const db2 = new StoreJson(testStorePath);

  assertEquals(db2.get("number5"), 5);

  assertEquals(existsSync(db.storePath), true);

  db.deleteStore();
  assertThrows(() => {
    db2.deleteStore();
  });

  const exists = existsSync(db.storePath);
  assertEquals(exists, false);
});
