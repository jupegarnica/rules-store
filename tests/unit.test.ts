import {
  deepClone,
  deepGet,
  deepSet,
  getKeys,
  isValidNumber,
} from "../src/helpers.ts";
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
  // deno-lint-ignore no-explicit-any
  const data = {} as any;

  const arr = [];
  arr[1] = true;

  deepSet(data, "a.1", true);
  assertEquals(Array.isArray(data.a), true);

  assertEquals(data, { a: arr });

  deepSet(data, "a.0", true);
  assertEquals(data, { a: [true, true] });

  assertEquals(deepSet([], "1", true), arr);

  deepSet(data, "b.0.a", 1);
  assertEquals(Array.isArray(data.b), true);
  assertEquals(data.b, [{ a: 1 }]);
});

Deno.test("[Helpers] deepGet", () => {
  const data = { a: { b: true }, x: { y: { z: true } } };

  assertEquals(deepGet(data, ""), data);
  const a = deepGet(data, "a");
  assertEquals(a, { b: true });

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
  assertEquals(deepGet(obj, "a"), [{ b: true }, null]);
});

Deno.test("[Helpers] getKeys", () => {
  assertEquals(getKeys("x.y.z"), ["x", "y", "z"]);
  assertEquals(getKeys("x/y/z"), ["x", "y", "z"]);
  assertEquals(getKeys("/x/y/z"), ["x", "y", "z"]);
  assertEquals(getKeys("x/y/z/"), ["x", "y", "z"]);
  assertEquals(getKeys("/x/y/z/"), ["x", "y", "z"]);
  assertEquals(getKeys("\\x\\y\\z\\"), ["x", "y", "z"]);
  assertEquals(getKeys("\\x.y/z\\"), ["x", "y", "z"]);
});

Deno.test("[Helpers] isValidNumber", () => {
  assertEquals(isValidNumber("0"), true);
  assertEquals(isValidNumber("3"), true);
  assertEquals(isValidNumber("3e3"), true);

  assertEquals(isValidNumber("a3"), false);
  assertEquals(isValidNumber("3a3"), false);
  assertEquals(isValidNumber("-3"), false);
  assertEquals(isValidNumber("z"), false);
  assertEquals(isValidNumber("z"), false);
  assertEquals(
    isValidNumber(`${Number.MAX_SAFE_INTEGER + 100}`),
    false,
  );
});

Deno.test("[Helpers] deepClone", () => {
  const a = { foo: "bar", obj: { a: [], b: 2 } };
  const b = deepClone(a);
  assertEquals(a, b);
  assertEquals(a !== b, true);
  assertEquals(a === b, false);
  assertEquals(a.obj !== b.obj, true);
  assertEquals(a.obj === b.obj, false);
  assertEquals(a.obj.a === b.obj.a, false);
  const c = [{ a: [], b: 2 }];
  const d = deepClone(c);
  assertEquals(c, d);
  assertEquals(Array.isArray(d), true);
  assertEquals(c === d, false);
  assertEquals(c[0].a === d[0].a, false);
  assertEquals(deepClone(undefined), undefined);
  assertEquals(deepClone(null), null);
  assertEquals(deepClone("a"), "a");
});
