// import { DeepProxy , proxyHandler} from "../src/deepProxy.js";
import {
  // deepProxy,
  assertDeepClone,
  debounce,
  deepClone,
  deepGet,
  deepMerge,
  deepSet,
  findParam,
  isNumberKey,
  keysFromPath,
} from "../src/helpers.ts";

import { assertEquals, assertThrows, delay, Spy, spy } from "./test_deps.ts";

Deno.test("[Helpers] deepSet", () => {
  const data = {};

  deepSet(data, ["a"], true);
  assertEquals(data, { a: true });

  deepSet(data, ["a", "b"], true);
  assertEquals(data, { a: { b: true } });

  deepSet(data, ["x", "y", "z"], true);
  assertEquals(data, { a: { b: true }, x: { y: { z: true } } });
});

Deno.test("[Helpers] deepSet array", () => {
  // deno-lint-ignore no-explicit-any
  const data = {} as any;

  const arr = [];
  arr[1] = true;

  deepSet(data, "a.1".split("."), true);
  assertEquals(Array.isArray(data.a), true);

  assertEquals(data, { a: arr });

  deepSet(data, "a.0".split("."), true);
  assertEquals(data, { a: [true, true] });
  const arr2 = [, "0"];
  deepSet(arr2, ["1"], true);
  assertEquals(arr2, arr);

  deepSet(data, "b.0.a".split("."), 1);
  assertEquals(Array.isArray(data.b), true);
  assertEquals(data.b, [{ a: 1 }]);
});

Deno.test("[Helpers] deepSet destroy shape", () => {
  const data = {};

  deepSet(data, ["a", "b"], 1);
  assertEquals(data, { a: { b: 1 } });

  deepSet(data, ["x", "0", "y"], 1);
  assertEquals(data, { a: { b: 1 }, x: [{ y: 1 }] });

  assertThrows(() => deepSet(data, ["a", "0", "c"], 2), TypeError, "not Array");

  assertThrows(() => deepSet(data, ["x", "a"], 2), TypeError, "not Object");
});

Deno.test("[Helpers] deepSet return removed", () => {
  const data0 = { a: 1, b: [2, 3], c: { d: { e: 4 } } };
  const data1 = { a: 1, b: [2, 3], c: { d: { e: 4 } } };
  const data2 = { a: 1, b: [2, 3], c: { d: { e: 4 } } };
  assertEquals(deepSet(data0, ["a"], 2), { keys: ["a"], value: 1 });
  assertEquals(deepSet(data1, ["b"], 3), { keys: ["b"], value: [2, 3] });
  assertEquals(deepSet(data2, ["c", "d"], 5), {
    keys: ["c", "d"],
    value: { e: 4 },
  });
});

Deno.test("[Helpers] deepGet", () => {
  const data = { a: { b: true }, x: { y: { z: true } } };

  assertEquals(deepGet(data, []), data);
  const a = deepGet(data, ["a"]);
  assertEquals(a, { b: true });

  const undef = deepGet(data, ["c"]);
  assertEquals(undef, undefined);

  const undef2 = deepGet(data, "c.d.e".split("."));
  assertEquals(undef2, undefined);
});

Deno.test("[Helpers] deepGet array", () => {
  const array = [{ a: true }, { y: { z: true } }];

  const a = deepGet(array, "0.a".split("."));
  assertEquals(a, true);

  const obj = { a: [{ b: true }, null] };

  const b = deepGet(obj, "a.0.b".split("."));
  assertEquals(b, true);
  const _1 = deepGet(obj, "a.1".split("."));
  assertEquals(_1, null);
  assertEquals(deepGet(obj, "a".split(".")), [
    { b: true },
    null,
  ]);
});

Deno.test("[Helpers] keysFromPath", () => {
  assertEquals(keysFromPath("x.y.z"), ["x", "y", "z"]);
  assertEquals(keysFromPath("x/y/z"), ["x", "y", "z"]);
  assertEquals(keysFromPath("/x/y/z"), ["x", "y", "z"]);
  assertEquals(keysFromPath("x/y/z/"), ["x", "y", "z"]);
  assertEquals(keysFromPath("/x/y/z/"), ["x", "y", "z"]);
  assertEquals(keysFromPath("\\x\\y\\z\\"), ["x", "y", "z"]);
  assertEquals(keysFromPath("\\x.y/z\\"), ["x", "y", "z"]);
});

Deno.test("[Helpers] isNumberKey", () => {
  assertEquals(isNumberKey("0"), true);
  assertEquals(isNumberKey("3"), true);
  assertEquals(isNumberKey("3e3"), true);

  assertEquals(isNumberKey("-3"), false);
  assertEquals(isNumberKey("a3"), false);
  assertEquals(isNumberKey("3a3"), false);
  assertEquals(isNumberKey("z"), false);
  assertEquals(isNumberKey("z"), false);
  assertEquals(
    isNumberKey(`${Number.MAX_SAFE_INTEGER + 100}`),
    false,
  );
});

Deno.test("[Helpers] deepClone basic", () => {
  const a = { b: { c: 1 } };
  const A = deepClone(a);

  assertEquals(a !== A, true);
  assertEquals(a.b !== A.b, true);
});

Deno.test("[Helpers] deepClone arrays", () => {
  const c = [{ a: [], b: 2 }];
  const d = deepClone(c);
  assertEquals(c, d);
  assertEquals(Array.isArray(d), true);
  assertEquals(c === d, false);
  assertEquals(c[0].a === d[0].a, false);
});

Deno.test("[Helpers] deepClone primitives", () => {
  assertEquals(deepClone(undefined), undefined);
  assertEquals(deepClone(null), null);
  assertEquals(deepClone("a"), "a");
  assertEquals(deepClone(1), 1);
  assertEquals(deepClone(0), 0);
  const sym = Symbol();
  assertEquals(deepClone(sym), sym);
});

Deno.test("[Helpers] findParam", () => {
  const obj = {
    $: false,
    x: false,
    x$y: false,
    z$: false,
    $a: true,
    $b: true,
    $c: true,
  };
  const cloned = deepClone(obj);
  assertEquals(cloned, obj);
  assertEquals(findParam(obj), "$a");
});

Deno.test("[Helpers] assertDeepClone", () => {
  const x = {
    a: { b: 1 },
  };
  const y = {
    a: { b: 1 },
  };
  const z = {
    a: x.a,
  };
  const i = {
    a: { b: 1, c: 2 },
  };
  assertDeepClone(x, y);
  assertDeepClone(y, z);
  assertThrows(() => assertDeepClone(x, z));
  assertThrows(() => assertDeepClone(x, i));
});
// Deno.test("[Helpers] deepProxy", () => {
//   // const a = { b: 1 } as any;
//   const a = { b: { c: { d: 1 } } } as any;
//   const A = deepProxy(a);
//   // A.b;
//   // console.log({A});
//   // console.log({a});

//   assertEquals(a, A);
//   assertEquals(a.b === A.b, true);
//   assertEquals(a.b, A.b);
//   assertEquals(a.b === A.b, true);
//   assertEquals(a.b.c, A.b.c);
//   assertEquals(a.b.c === A.b.c, true);

//   assertThrows(() => {
//     A.b.c.d = 2;
//   },Error,'Inmutable data');
//   assertThrows(() => {
//     A.b = 2;
//   },Error,'Inmutable data');

//   assertThrows(() => {
//     delete A.b ;
//   },Error,'Inmutable data');

//   assertEquals(a.b.c.d, 1);
//   assertEquals(A.b.c.d, 1);

//   assertThrows(() => {
//     a.b.c.d = 2;
//   },Error,'Inmutable data');
//   assertThrows(() => {
//     a.b.c = 2;
//   },Error,'Inmutable data');

//   assertThrows(() => {
//     delete a.b.c;
//   },Error,'Inmutable data');
//   assertEquals(A, { b: { c: { d: 1 } } });
// });

Deno.test("[Helpers] debounce resolve", async () => {
  const RUNS = 3;
  const w = {
    log: () => {},
    error: () => {},
    run: () => {},
  };
  const runner = async () => {
    await delay(0);
    run();
  };

  const run: Spy<typeof w> = spy(w, "run");
  const log: Spy<typeof w> = spy(w, "log");
  const error: Spy<typeof w> = spy(w, "error");

  const debounced = debounce(runner, 1);

  for (let i = 0; i < RUNS - 1; i++) {
    debounced().then(w.log).catch(w.error);
  }
  await debounced().then(w.log).catch(w.error);

  assertEquals(run.calls.length, 1);
  assertEquals(log.calls.length, RUNS);
  assertEquals(error.calls.length, 0);
});

Deno.test("[Helpers] debounce reject", async () => {
  const RUNS = 3;
  const w = {
    log: () => {},
    error: () => {},
    run: () => {},
  };
  const runner = async () => {
    await delay(0);
    run();
    throw new Error("ups");
  };

  const run: Spy<typeof w> = spy(w, "run");
  const log: Spy<typeof w> = spy(w, "log");
  const error: Spy<typeof w> = spy(w, "error");

  const debounced = debounce(runner, 1);

  for (let i = 0; i < RUNS - 1; i++) {
    debounced().then(w.log).catch(w.error);
  }
  await debounced().then(w.log).catch(w.error);
  assertEquals(run.calls.length, 1);
  assertEquals(log.calls.length, 0);
  assertEquals(error.calls.length, RUNS);
});

Deno.test("[Helpers] deepMerge obj", () => {
  const target = { a: { b: { c: 1, d: 2 } } };
  const source = { a: { x: 1, b: { e: 3 } } };

  deepMerge(target, source);
  assertEquals(target, { a: { x: 1, b: { c: 1, d: 2, e: 3 } } });
});

Deno.test("[Helpers] deepMerge array", () => {
  const target = { a: [{ b: 1, c: 2 }] };
  const source = { a: [{ d: 3 }], x: 1 };
  const res = deepMerge(target, source);

  assertEquals(target, { a: [{ b: 1, c: 2, d: 3 }], x: 1 });
  assertEquals(target === res, true);
});