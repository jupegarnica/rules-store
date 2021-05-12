import { StoreLocalStorage } from "../core/StoreLocalStorage.ts";
import { assertEquals } from "./test_deps.ts";
const testStorePath = "./test.store";

Deno.test({
  // only: true,
  ignore: Deno.env.get("DENO_ENV") === "CI",
  name: "[StoreLocalStorage] Persist and load from localStorage",
  sanitizeResources: false,
  fn: () => {
    const db = new StoreLocalStorage({ name: testStorePath });

    db.set("number", 5);
    assertEquals(db.get("number"), 5);

    db.persist();

    {
      const db2 = new StoreLocalStorage({
        name: testStorePath,
      });

      db2.set("number", 5);
      assertEquals(db2.get("number"), 5);
      db2.deletePersisted();
    }
  },
});
