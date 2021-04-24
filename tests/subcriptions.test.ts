import { Store } from "../src/Store.ts";
import { Value } from "../src/types.ts";
import { assertEquals } from "./test_deps.ts";

Deno.test("[Store subscription] .subscribe", () => {
  const db = new Store();

  db.set("A", 0);
  let called = 0;
  const onChange = (data: unknown) => {
    called++;
    assertEquals(data, called);
  };
  const returned = db.subscribe("A", onChange);

  assertEquals(returned, 0);
  assertEquals(called, 0);

  db.set("A", 1);
  assertEquals(called, 1);

  db.set("A", 2);
  assertEquals(called, 2);
});

Deno.test("[Store subscription] .subscribe with deeper set",()=>{
  const db = new Store();
  db.set("a.b", { c:0, d:0 } );

  let called = 0;
  const onChange = (data:Value) => {
    // console.log({cbData:data});
    called++;
    assertEquals(data.c, 1);

  };
  db.subscribe("a.b", onChange);

  assertEquals(called, 0);
  db.set("a.b.c", 1);
  assertEquals(called, 1);
  db.set("a.b.d", 2);
  assertEquals(called, 2);

})
Deno.test("[Store subscription] .on", () => {
  const db = new Store();

  db.set("A", 1);
  let called = 0;
  const onChange = (data: unknown) => {
    called++;
    assertEquals(data, called);
  };
  const returned = db.on("A", onChange);

  assertEquals(returned, 1);
  assertEquals(called, 1);

  db.set("A", 2);
  assertEquals(called, 2);

  db.set("A", 3);
  assertEquals(called, 3);
});

Deno.test("[Store subscription] off", () => {
  const db = new Store();

  db.set("A", 1);

  let called = false;
  const onChange = (data: unknown) => {
    called = true;
    assertEquals(data, 1);
  };

  db.on("A", onChange);
  assertEquals(called, true);
  db.off("A", onChange);
  called = false;
  db.set("A", 3); // should not call onChange
  assertEquals(called, false);

  let hasThrown = false;
  try {
    db.off("A", onChange);
  } catch (error) {
    hasThrown = true;
    assertEquals(error instanceof Error, true);
  }
  assertEquals(hasThrown, true);
});

Deno.test("[Store] Deep basic subscription ", () => {
  const db = new Store();
  db.set("a.b.c", true);

  let called = false;
  const onChangeC = (data: unknown) => {
    called = true;
    assertEquals(data, true);
  };
  const C = db.on("a.b.c", onChangeC);
  assertEquals(C, true);

  assertEquals(called, true);
});

Deno.test("[Store] Deep complex subscription", () => {
  const db = new Store();
  db.set("a.b.c", true);

  let called = 0;
  const onChange = (data: unknown) => {
    called++;
    if (called === 1) {
      assertEquals(data, { c: true });
    }
    if (called === 2) {
      assertEquals(data, { c: 33 });
    }
    if (called === 3) {
      assertEquals(data, { c: 33, d: 34 });
    }
    if (called === 4) {
      assertEquals(data, undefined);
    }
  };

  const B = db.on("a.b", onChange);

  //  should be called
  assertEquals(B, { c: true });
  assertEquals(called, 1);

  db.set("a.b.c", 33);
  assertEquals(db.get("a.b.c"), 33);
  assertEquals(called, 2);

  db.set("a.b.d", 34);
  assertEquals(called, 3);

  db.set("a", 1);
  assertEquals(called, 4);

  //  should not be called
  db.set("a.z", true);
  db.set("z", true);

  assertEquals(called, 4);
});

Deno.test("[Store] inmutable subscribe callback", () => {
  const db = new Store();
  db.set("a.b.c", 0);

  let called = 0;
  const onChange = (data: Value) => {
    called++;
    assertEquals(data, { c: 1 });
    data.c = 2;
    assertEquals(data, { c: 2 });

  };
  db.subscribe("a.b", onChange);

  assertEquals(called, 0);
  db.set("a.b.c", 1);
  assertEquals(called, 1);
  assertEquals(db.get('a.b.c'),1);

});
