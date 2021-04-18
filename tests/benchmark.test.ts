import {
  deepClone,
  deepGet,
  deepSet,
  findParam,
  isValidNumber,
  keysFromPath,
} from "../src/helpers.ts";
import { assertEquals } from "./test_deps.ts";

Deno.test("[Helpers] deepSet", () => {
  const data = {};

  deepSet(data, "a".split("."), true);
  assertEquals(data, { a: true });

  deepSet(data, "a.b".split("."), true);
  assertEquals(data, { a: { b: true } });

  deepSet(data, "x.y.z".split("."), true);
  assertEquals(data, { a: { b: true }, x: { y: { z: true } } });
});
