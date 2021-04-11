import { deepSet, deepGet, affectedKeys } from './helpers.ts';
import { assertEquals } from './test_deps.ts';

Deno.test('deepSet', () => {
  const data = {};

  deepSet(data, 'a', true);
  assertEquals(data, { a: true });

  deepSet(data, 'a.b', true);
  assertEquals(data, { a: { b: true } });

  deepSet(data, 'x.y.z', true);
    assertEquals(data, { a: { b: true }, x: { y: { z: true } } });
});

Deno.test('deepGet', () => {
    const data = { a: { b: true }, x: { y: { z: true } } };

    const a = deepGet(data, 'a');
    assertEquals(a, { b: true });

    const z = deepGet(data, 'x.y.z');
    assertEquals(z, true);

    const b = deepGet(data, 'a/b');
    assertEquals(b, true);

    const b2 = deepGet(data, '/a/b');
    assertEquals(b2, true);
    const b3 = deepGet(data, '/a/b/');
    assertEquals(b3, true);

    const b4 = deepGet(data, '\\a.b/');
    assertEquals(b4, true);

});