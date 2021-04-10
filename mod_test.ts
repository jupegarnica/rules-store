import { Store } from './mod.ts';
import { existsSync } from './deps.ts';
import { assertEquals } from './test_deps.ts';

Deno.test('Empty DB', async () => {
  const db = new Store();
  await db.write();

  assertEquals(existsSync(db.storePath), false);
});

Deno.test('Simple Number DB', async () => {
  const db = new Store();

  db.set('number', 5);
  assertEquals(db.get('number'), 5);

  await db.write();

  assertEquals(existsSync(db.storePath), true);

  await Deno.remove(db.storePath);
});

Deno.test('DB subscription on',  () => {
  const db = new Store();

  db.set('A', 1);
  let called = false;
  const onChange = (data: unknown) => {
    called = true;
    assertEquals(data, 1);
  };
  const returned = db.on('A', onChange);

  assertEquals(returned, 1);
  assertEquals(called, true);
});

Deno.test('DB subscription off',  () => {
  const db = new Store();

  db.set('A', 1);

  let called = false;
  const onChange = (data: unknown) => {
    called = true;
    assertEquals(data, 1);
  };

  db.on('A', onChange);
  assertEquals(called, true);
  db.off('A', onChange);
  called = false;
  db.set('A', 3); // should not call onChange
  assertEquals(called, false);

  let hasThrown = false;
  try {
    db.off('A', onChange);
  } catch (error) {
    hasThrown = true;
    assertEquals(error instanceof Error, true);
  }
  assertEquals(hasThrown, true);
});

Deno.test('DB delete store', async () => {
  const db = new Store();

  db.set('number1', 5);
  db.set('number2', 10);

  await db.write();

  assertEquals(existsSync(db.storePath), true);

  await db.deleteStore();

  // Make sure to clean up first in case of assert failure.
  const x = existsSync(db.storePath);
  // if (x) await Deno.remove(db.storePath);

  assertEquals(x, false);
});
