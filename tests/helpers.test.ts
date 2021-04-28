// import { DeepProxy , proxyHandler} from "../src/deepProxy.js";
import {
  // deepProxy,
  assertDeepClone,
  debounce,
  deepClone,
  deepGet,
  deepMerge,
  deepSet,
  getParamFromObject,
  getParamsFromKeys,
  isNumberKey,
  keysFromPath,
  pathsMatched,
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

Deno.test("[Helpers] deepSet removed empty", () => {
  const data = {};
  const removed = deepSet(data, ["a", "b"], 2);

  assertEquals(removed, [
    {
      keys: [
        "a",
      ],
      type: "set",
      value: undefined,
    },
    {
      keys: [
        "a",
        "b",
      ],
      type: "set",
      value: undefined,
    },
  ]);
});
Deno.test("[Helpers] deepSet array", () => {
  const data = [1, 2, 3, 4];
  const removed = deepSet(data, ["1"], 5);
  assertEquals(removed, [
    {
      keys: [
        "1",
      ],
      type: "set",
      value: 2,
    },
  ]);
  assertEquals(data, [1, 5, 3, 4]);
});
Deno.test("[Helpers] deepSet array complex", () => {
  const data = [{ a: 1 }, { b: { c: [1, 2, 3] } }];
  const removed = deepSet(data, ["0", "a"], 3);
  assertEquals(removed, [
    {
      keys: [
        "0",
        "a",
      ],
      type: "set",
      value: 1,
    },
  ]);
  const removed2 = deepSet(data, ["1", "b", "c", "1"], 4);
  assertEquals(removed2, [
    {
      keys: [
        "1",
        "b",
        "c",
        "1",
      ],
      type: "set",
      value: 2,
    },
  ]);
});

Deno.test("[Helpers] deepSet removed complex", () => {
  const data0 = { a: 1, b: [2, 3], c: { d: { e: 4 } } };
  const data1 = { a: 1, b: [2, 3], c: { d: { e: 4 } } };
  const data2 = { a: 1, b: [2, 3], c: { d: { e: 4 }, f: 1 } };
  assertEquals(deepSet(data0, ["a"], 2), [{
    keys: ["a"],
    type: "set",
    value: 1,
  }]);
  assertEquals(deepSet(data1, ["b"], 3), [{
    keys: ["b"],
    type: "set",
    value: [2, 3],
  }]);
  assertEquals(deepSet(data2, ["c", "d"], 5), [{
    keys: ["c", "d"],
    type: "set",
    value: { e: 4 },
  }]);
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

Deno.test("[Helpers] deepClone Date. Must treat dates as primitive type not as objects", () => {
  const date = new Date("1999-01-08T23:00:00.000Z");

  const a = { b: date };
  const A = deepClone(a);
  assertEquals(a !== A, true);
  assertEquals(Number(a.b) - Number(A.b), 0);
});

Deno.test("[Helpers] getParamFromObject", () => {
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
  assertEquals(getParamFromObject(obj), "$a");
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
  const runner = async () => {
    await delay(0);
    run();
  };

  const run: Spy<void> = spy();
  const log: Spy<void> = spy();
  const error: Spy<void> = spy();

  const debounced = debounce(runner, 1);

  for (let i = 0; i < RUNS - 1; i++) {
    debounced().then(log).catch(error);
  }
  await debounced().then(log).catch(error);

  assertEquals(run.calls.length, 1);
  assertEquals(log.calls.length, RUNS);
  assertEquals(error.calls.length, 0);
});

Deno.test("[Helpers] debounce reject", async () => {
  const RUNS = 3;
  const runner = async () => {
    await delay(0);
    run();
    throw new Error("ups");
  };

  const run: Spy<void> = spy();
  const log: Spy<void> = spy();
  const error: Spy<void> = spy();

  const debounced = debounce(runner, 1);

  for (let i = 0; i < RUNS - 1; i++) {
    debounced().then(log).catch(error);
  }
  await debounced().then(log).catch(error);
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

Deno.test("[Helpers] deepMerge empty target", () => {
  const target = {};
  const source = { a: [{ d: 3 }], x: 1 };
  const res = deepMerge(target, source);

  assertEquals(target, source);
  assertEquals(target === res, true);
});

Deno.test("[Helpers] deepMerge empty source", () => {
  const target = { a: [{ b: 1, c: 2 }] };
  const source = {};
  const res = deepMerge(target, source);

  assertEquals(target, { a: [{ b: 1, c: 2 }] });
  assertEquals(target === res, true);
});

Deno.test("[Helpers] deepMerge fill", () => {
  const target = [1, 2, 3];
  const source = [0, , , 4];
  const res = deepMerge(target, source);

  assertEquals(target, [0, 2, 3, 4]);
  assertEquals(target === res, true);
});

Deno.test("[Helpers] pathsMatched", () => {
  const mutation = { a: 1, b: 2, c: { d: 3 }, e: { f: { g: 4 } } };
  const A = pathsMatched(mutation, ["a"]);
  assertEquals(A, [["a"]]);

  const B = pathsMatched(mutation, ["b"]);
  assertEquals(B, [["b"]]);

  const C = pathsMatched(mutation, ["c", "d"]);
  assertEquals(C, [["c", "d"]]);

  const E = pathsMatched(mutation, ["e", "f", "g"]);
  assertEquals(E, [["e", "f", "g"]]);

  const X = pathsMatched(mutation, ["c", "x"]);
  assertEquals(X, []);
});

Deno.test("[Helpers] pathsMatched $query", () => {
  const mutation = { a: 1, b: 2 };
  const A = pathsMatched(mutation, ["$query"]);
  assertEquals(A, [["a"], ["b"]]);
});
Deno.test("[Helpers] pathsMatched $query", () => {
  const mutation = { a: 1, b: 2, c: { d: 3 } };
  const A = pathsMatched(mutation, ["$query"]);
  assertEquals(A, [["a"], ["b"], ["c"]]);
});
Deno.test("[Helpers] pathsMatched $query", () => {
  const mutation = { a: { b: 1, c: 2 } };
  const A = pathsMatched(mutation, ["a", "$query"]);
  assertEquals(A, [["a", "b"], ["a", "c"]]);
});

Deno.test("[Helpers] pathsMatched $query", () => {
  const mutation = { x: { a: { b: 1, c: 2 } } };
  const A = pathsMatched(mutation, ["x", "a", "$query"]);
  assertEquals(A, [["x", "a", "b"], ["x", "a", "c"]]);
});

Deno.test("[Helpers] pathsMatched $query", () => {
  const mutation = { a: { b: 1, c: 2 } };
  const A = pathsMatched(mutation, ["$query", "b"]);
  assertEquals(A, [["a", "b"]]);
});

Deno.test("[Helpers] pathsMatched $query", () => {
  const mutation = { a: { b: 1, c: 2 }, A: { b: 1, c: 2 } };
  const A = pathsMatched(mutation, ["$query", "b"]);
  assertEquals(A, [["a", "b"], ["A", "b"]]);
});

Deno.test("[Helpers] pathsMatched array", () => {
  const mutation = [1, 2, 3];
  const A = pathsMatched(mutation, ["1"]);
  assertEquals(A, [["1"]]);
});

Deno.test("[Helpers] pathsMatched array", () => {
  const mutation = [{ a: 1 }, { b: 2 }, { a: 3 }];
  const A = pathsMatched(mutation, ["$index", "b"]);
  assertEquals(A, [["1", "b"]]);
});

Deno.test("[Helpers] pathsMatched array", () => {
  const mutation = [{ a: 1 }, { b: 2 }, { a: 3 }];
  const A = pathsMatched(mutation, ["$index", "a"]);
  assertEquals(A, [["0", "a"], ["2", "a"]]);
});

Deno.test("[Helpers] pathsMatched array", () => {
  const mutation = [{ a: 1 }, { b: 2 }, { a: 3 }];
  const A = pathsMatched(mutation, ["$index", "$any"]);
  assertEquals(A, [["0", "a"], ["1", "b"], ["2", "a"]]);
});
Deno.test("[Helpers] pathsMatched array", () => {
  const mutation = [[1, 2], [3, 4]];
  const A = pathsMatched(mutation, ["$x", "$y"]);
  assertEquals(A, [["0", "0"], ["0", "1"], ["1", "0"], ["1", "1"]]);
});

Deno.test("[Helpers] pathsMatched deeper", () => {
  const mutation = { a: 1 };
  const A = pathsMatched(mutation, ["a"]);
  assertEquals(A, [["a"]]);
});

Deno.test("[Helpers] pathsMatched deeper", () => {
  const mutation = {a:1};
  const A = pathsMatched(mutation, ["a",'c']);
  assertEquals(A, [["a",'c']]);
});

Deno.test("[Helpers] pathsMatched deeper", () => {
  const mutation = { a: 1 };
  const A = pathsMatched(mutation, ["a", "b"]);
  assertEquals(A, [["a", "b"]]);
});

Deno.test("[Helpers] getParamsFromKeys", () => {
  assertEquals(
    getParamsFromKeys(["a"], ["$x"]),
    { $x: "a" },
  );
  assertEquals(
    getParamsFromKeys(["a", "b"], ["$x", "b"]),
    { $x: "a" },
  );
  assertEquals(
    getParamsFromKeys(["a", "b"], ["$x", "$y"]),
    { $x: "a", $y: "b" },
  );
  assertEquals(
    getParamsFromKeys(["a", "b", "c"], ["a", "b", "c"]),
    {},
  );
});
