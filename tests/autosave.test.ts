import { StoreJson } from "../src/StoreJson.ts";
import { existsSync } from "../src/deps.ts";
import { assertEquals, delay, spy } from "./test_deps.ts";
import type { Spy } from "./test_deps.ts";

const testStorePath = "./new.store.json";

// Persistance StoreJson
////////////////////////
if (existsSync(testStorePath)) {
  Deno.removeSync(testStorePath);
}

Deno.test("[writeLazy] must write lazy", async () => {
  const db = new StoreJson({ filename: testStorePath, autoSave: false });
  db.set(`item0`, 0);
  db.writeLazy();
  assertEquals(existsSync(db.storePath), false);
  await db.writeLazy();
  assertEquals(existsSync(db.storePath), true);
  await Deno.remove(db.storePath);
});

Deno.test("[writeLazy] autoSave must write lazy", async () => {
  const RUNS = 10;

  const db = new StoreJson({ filename: testStorePath, autoSave: true });

  const mock: Spy<StoreJson> = spy(db, "write");
  for (let i = 0; i < RUNS; i++) {
    db.set(`item` + i, i);
  }
  assertEquals(existsSync(db.storePath), false);
  assertEquals(mock.calls.length, 0);
  await db.writeLazy();
  assertEquals(mock.calls.length, 1);
  assertEquals(existsSync(db.storePath), true);

  const dbDisk = new StoreJson({ filename: testStorePath });

  assertEquals(dbDisk.find("", () => true).length, RUNS);
  await Deno.remove(db.storePath);
  mock.restore();
});

Deno.test("[writeLazy] autoSave and writeLazyDelay", async () => {
  const RUNS = 3;

  const db = new StoreJson({
    filename: testStorePath,
    autoSave: true,
    writeLazyDelay: 1,
  });

  const mock: Spy<StoreJson> = spy(db, "write");
  for (let i = 0; i < RUNS; i++) {
    db.set(`item` + i, i);
    await delay(0);
  }
  await db.writeLazy();

  assertEquals(mock.calls.length, 1);
  assertEquals(existsSync(db.storePath), true);

  const dbDisk = new StoreJson({ filename: testStorePath });

  assertEquals(dbDisk.find("", () => true).length, RUNS);
  await Deno.remove(db.storePath);
  mock.restore();
});

Deno.test("[writeLazy] autoSave and writeLazyDelay 2", async () => {
  const RUNS = 3;

  const db = new StoreJson({
    filename: testStorePath,
    autoSave: true,
    writeLazyDelay: 0,
  });

  const mock: Spy<StoreJson> = spy(db, "write");
  for (let i = 0; i < RUNS; i++) {
    db.set(`item` + i, i);
    await delay(2);
  }
  assertEquals(mock.calls.length, RUNS);
  assertEquals(existsSync(db.storePath), true);
  await Deno.remove(db.storePath);
  mock.restore();
});
