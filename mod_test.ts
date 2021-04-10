import { Store } from './mod.ts';
import { exists } from './deps.ts';
import { assertEquals } from './test_deps.ts';

Deno.test('Empty DB', async () => {
  const db = new Store();
  await db.load();
  await db.write();

  assertEquals(await exists(db.storePath), false);
});

Deno.test('Simple Number DB', async () => {
  const db = new Store();
  await db.load();

  db.set('number1', 5);
  db.set('number2', 10);

  await db.write();

  assertEquals(await exists(db.storePath), true);

  await Deno.remove(db.storePath);
});

Deno.test('DB subscription on', async () => {
  const db = new Store();
  await db.load();

  db.set('A', 1);
  const onChange = (data: unknown) => assertEquals(data, 2);
  db.on('A', onChange);

  db.set('A', 2);
});

Deno.test('DB subscription off', async () => {
  const db = new Store();
  await db.load();

  db.set('A', 1);
  //   db.on('A', (data) => console.log(data, 2));
  const onChange = (data: unknown) => assertEquals(data, 2);
  db.on('A', onChange);
  db.set('A', 2);

  db.off('A', onChange);
  db.set('A', 3); // should not call onChange

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
  await db.load();

  db.set('number1', 5);
  db.set('number2', 10);

  await db.write();

  assertEquals(await exists(db.storePath), true);

  await db.deleteStore();

  // Make sure to clean up first in case of assert failure.
  const x = await exists(db.storePath);
  // if (x) await Deno.remove(db.storePath);

  assertEquals(x, false);
});
