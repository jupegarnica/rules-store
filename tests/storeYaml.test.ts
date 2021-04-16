import { StoreYaml } from "../src/StoreYaml.ts";
import { existsSync } from "../src/deps.ts";
import { assertEquals, assertThrows } from "./test_deps.ts";
const testStorePath = "../test.store.yaml";

// Persistance StoreYaml
////////////////////////
Deno.test("[StoreYaml] Empty DB should not be persisted", () => {
  const db = new StoreYaml({filename:"./not-exiting.yaml"});
  db.write();

  assertEquals(existsSync(db.storePath), false);
});

Deno.test("[StoreYaml] Write DB", async () => {
  const db = new StoreYaml({filename:testStorePath});

  db.set("number", 5);
  assertEquals(db.get("number"), 5);

  db.write();

  assertEquals(existsSync(db.storePath), true);

  await Deno.remove(db.storePath);
});

Deno.test("[StoreYaml] DB load / write / delete store", () => {
  const db = new StoreYaml({filename:testStorePath});

  db.set("number5", 5);
  db.set("number10", 10);

  db.write(testStorePath);

  const db2 = new StoreYaml({filename:testStorePath});

  assertEquals(db2.get("number5"), 5);

  assertEquals(existsSync(db.storePath), true);

  db.deleteStore();
  assertThrows(() => {
    db2.deleteStore();
  });

  const exists = existsSync(db.storePath);
  assertEquals(exists, false);
});
