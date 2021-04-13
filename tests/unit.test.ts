import { deepGet, deepSet, isValidNumber } from "../src/helpers.ts";
import { assertEquals } from "./test_deps.ts";

Deno.test("[Helpers] deepSet", () => {
  const data = {};

  deepSet(data, "a", true);
  assertEquals(data, { a: true });

  deepSet(data, "a.b", true);
  assertEquals(data, { a: { b: true } });

  deepSet(data, "x.y.z", true);
  assertEquals(data, { a: { b: true }, x: { y: { z: true } } });
});

Deno.test("[Helpers] deepSet array", () => {
  const data = {};

  const arr = [];
  arr[1] = true;

  deepSet(data, "a.1", true);
  assertEquals(data, { a: arr });

  deepSet(data, "a.0", true);
  assertEquals(data, { a: [true, true] });

  assertEquals(deepSet([], "1", true), arr);
});

Deno.test("[Helpers] deepGet", () => {
  const data = { a: { b: true }, x: { y: { z: true } } };

  const a = deepGet(data, "a");
  assertEquals(a, { b: true });

  const z = deepGet(data, "x.y.z");
  assertEquals(z, true);

  const b = deepGet(data, "a/b");
  assertEquals(b, true);

  const b2 = deepGet(data, "/a/b");
  assertEquals(b2, true);
  const b3 = deepGet(data, "/a/b/");
  assertEquals(b3, true);

  const b4 = deepGet(data, "\\a.b/");
  assertEquals(b4, true);

  const undef = deepGet(data, "c");
  assertEquals(undef, undefined);

  const undef2 = deepGet(data, "c.d.e");
  assertEquals(undef2, undefined);
});

Deno.test("[Helpers] deepGet array", () => {
  const array = [{ a: true }, { y: { z: true } }];

  const a = deepGet(array, "0.a");
  assertEquals(a, true);

  const obj = { a: [{ b: true }, null] };

  const b = deepGet(obj, "a.0.b");
  assertEquals(b, true);

  const _1 = deepGet(obj, "a.1");
  assertEquals(_1, null);
});

Deno.test("[Helpers] isValidNumber", () => {
  assertEquals(isValidNumber("3"), true);
  assertEquals(isValidNumber("3e3"), true);

  assertEquals(isValidNumber("a3"), false);
  assertEquals(isValidNumber("3a3"), false);
  assertEquals(isValidNumber("-3"), false);
  assertEquals(isValidNumber("z"), false);
  assertEquals(isValidNumber("z"), false);
});
