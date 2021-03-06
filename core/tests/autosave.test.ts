import { StoreJson } from "../StoreJson.ts";
import { existsSync } from "../deps.ts";
import { assertEquals, delay, spy } from "./test_deps.ts";
import type { Spy } from "./test_deps.ts";

const testStorePath = "./new.store.json";

// Persistance StoreJson
////////////////////////
if (existsSync(testStorePath)) {
  Deno.removeSync(testStorePath);
}

Deno.test("[persistLazy] must write lazy", async () => {
  const db = new StoreJson({ name: testStorePath, autoSave: false });
  db.set(`item0`, 0);
  db.persistLazy();
  assertEquals(existsSync(db.storePath), false);
  await db.persistLazy();
  assertEquals(existsSync(db.storePath), true);
  await Deno.remove(db.storePath);
});

Deno.test("[persistLazy] autoSave must write lazy", async () => {
  const RUNS = 10;

  const db = new StoreJson({ name: testStorePath, autoSave: true });

  const mock: Spy<StoreJson> = spy(db, "persist");
  for (let i = 0; i < RUNS; i++) {
    db.set(`item` + i, i);
  }
  assertEquals(existsSync(db.storePath), false);
  assertEquals(mock.calls.length, 0);
  await db.persistLazy();
  assertEquals(mock.calls.length, 1);
  assertEquals(existsSync(db.storePath), true);

  const dbDisk = new StoreJson({ name: testStorePath });

  assertEquals(dbDisk.find("", () => true).length, RUNS);
  await Deno.remove(db.storePath);
  mock.restore();
});

Deno.test("[persistLazy] autoSave and persistLazyDelay", async () => {
  const RUNS = 3;

  const db = new StoreJson({
    name: testStorePath,
    autoSave: true,
    persistLazyDelay: 4,
  });

  const mock: Spy<StoreJson> = spy(db, "persist");
  for (let i = 0; i < RUNS; i++) {
    db.set(`item` + i, i);
    await delay(0);
  }
  await db.persistLazy();

  assertEquals(mock.calls.length, 1);
  assertEquals(existsSync(db.storePath), true);

  const dbDisk = new StoreJson({ name: testStorePath });

  assertEquals(dbDisk.find("", () => true).length, RUNS);
  await Deno.remove(db.storePath);
  mock.restore();
});

Deno.test("[persistLazy] autoSave and persistLazyDelay 2", async () => {
  const RUNS = 3;

  const db = new StoreJson({
    name: testStorePath,
    autoSave: true,
    persistLazyDelay: 0,
  });

  const mock: Spy<StoreJson> = spy(db, "persist");
  for (let i = 0; i < RUNS; i++) {
    db.set(`item` + i, i);
    await delay(4);
  }
  assertEquals(mock.calls.length, RUNS);
  assertEquals(existsSync(db.storePath), true);
  await Deno.remove(db.storePath);
  mock.restore();
});
