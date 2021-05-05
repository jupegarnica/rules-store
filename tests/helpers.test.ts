// import { DeepProxy , proxyHandler} from "../core/deepProxy.js";
import {
  // deepProxy,
  assertDeepClone,
  debounce,
  deepClone,
  deepGet,
  deepMerge,
  deepSet,
  findRulesOnPath,
  getParamFromObject,
  getParamsFromKeys,
  isNumberKey,
  keysFromPath,
  // findDeepestRule,
  pathsMatched,
} from "../core/helpers.ts";
import { ObjectOrArray } from "../core/types.ts";
import { findAllRules, findRule } from "../core/helpers.ts";
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
  assertEquals(keysFromPath("x.y.z"), ["x.y.z"]);
  assertEquals(keysFromPath("x/y/z"), ["x", "y", "z"]);
  assertEquals(keysFromPath("/x/y/z"), ["x", "y", "z"]);
  assertEquals(keysFromPath("x/y/z/"), ["x", "y", "z"]);
  assertEquals(keysFromPath("/x/y/z/"), ["x", "y", "z"]);
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

Deno.test({
  // only: true,
  name: "[Helpers] deepClone Sets",
  fn: () => {
    const c = new Set([{ a: 1 }, { a: 2 }]);
    const d = deepClone(c);

    assertEquals(c, d);
    assertEquals(d instanceof Set, true);
    assertEquals([...c], [...d]);
    assertEquals([...c][0] !== [...d][0], true);
    assertEquals([...c][1] !== [...d][1], true);
    assertEquals([...c][0].a === [...d][0].a, true);
    assertEquals([...c][1].a === [...d][1].a, true);
  },
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

Deno.test("[Helpers] deepMerge mix shapes", () => {
  const target = { a: { b: null } };
  const source = { a: [{ d: 3 }], x: 1 };
  const res = deepMerge(target, source);

  assertEquals(target, source);
  assertEquals(target === res, true);
});

Deno.test("[Helpers] deepMerge empty target", () => {
  const target = {};
  const source = [1, 2, 3];
  const res = deepMerge(target, source);

  assertEquals(target, source);
  assertEquals(target === res, true);
});

Deno.test("[Helpers] deepMerge empty target arr", () => {
  const target = [] as ObjectOrArray;
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

Deno.test("[Helpers] pathsMatched at root", () => {
  const mutation = { a: 1 };
  const A = pathsMatched(mutation, []);
  assertEquals(A, []);
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
  const mutation = { a: 1 };
  const A = pathsMatched(mutation, ["a", "b", "c"]);
  assertEquals(A, [["a", "b", "c"]]);
});
Deno.test("[Helpers] pathsMatched deeper", () => {
  const mutation = { users: [1] };
  const A = pathsMatched(mutation, ["users", "$id", "name"]);
  assertEquals(A, [["users", "0", "name"]]);
});

Deno.test("[Helpers] pathsMatched deeper", () => {
  const mutation = { b: 1 };
  const A = pathsMatched(mutation, ["a"]);
  assertEquals(A, []);
});

Deno.test("[Helpers] pathsMatched deeper", () => {
  const mutation = { a: { b: { d: 1 } } };
  const A = pathsMatched(mutation, ["a", "b", "c"]);
  assertEquals(A, []);
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

Deno.test("[Helpers] findRule", () => {
  const fn = () => 0;
  const rules = {
    _readAs: fn,

    a: {
      _readAs: () => 1,
    },
    $else: {
      _readAs: () => 2,
    },
  };

  assertEquals(findRule("_readAs", [], rules)["_readAs"](), 0);
  assertEquals(findRule("_readAs", [], rules), {
    params: {},
    rulePath: [],
    _readAs: fn,
  });
  assertEquals(findRule("_readAs", ["a"], rules)["_readAs"](), 1);
  assertEquals(findRule("_readAs", ["b"], rules).params.$else, "b");
  assertEquals(findRule("_readAs", ["x", "y"], rules), {
    params: {
      $else: "x",
    },
    _readAs: undefined,
    rulePath: ["x", "y"],
  });
});

const context = { data: "bar", params: {}, newData: undefined, rootData: {} };

Deno.test("[Rules _validate] findAllRules basic", () => {
  const rules = {
    a: {
      _validate: () => 1,
    },
  };
  const target = {
    a: 1,
  };
  const found = findAllRules(
    "_validate",
    target,
    rules,
  );
  assertEquals(found.length, 1);
  assertEquals(found[0]["_validate"]?.(context), 1);
  assertEquals(found[0].params, {});
});

Deno.test("[Rules _validate] findAllRules not object target", () => {
  const rules = {
    _validate: () => 1,
  };
  const target = undefined;
  const found = findAllRules(
    "_validate",
    target,
    rules,
  );
  assertEquals(found.length, 1);
  assertEquals(found[0]["_validate"]?.(context), 1);
  assertEquals(found[0].params, {});
});

// Deno.test("[Rules _validate] findAllRules from", () => {
//   const rules = {
//     _validate: () => 1,
//   };
//   const target = undefined;
//   const found = findAllRules(
//     "_validate",
//     target,
//     rules,
//   );
//   assertEquals(found.length, 1);
//   assertEquals(found[0]["_validate"]?.(context), 1);
//   assertEquals(found[0].params, {});
// });

Deno.test("[Rules _validate] findAllHelpers basic", () => {
  const rules = {
    $i: {
      _validate: () => 1,
    },
  };
  const target = {
    a: 1,
  };
  const found = findAllRules(
    "_validate",
    target,
    rules,
  );
  assertEquals(found.length, 1);
  assertEquals(found[0]["_validate"]?.(context), 1);
  assertEquals(found[0].params, { $i: "a" });
});

Deno.test("[Rules _validate] findAllRules no params", () => {
  const rules = {
    _validate: () => 0,
    a: {
      _validate: () => 1,
      b: {
        _validate: () => 2,
        c: {
          _validate: () => 3,
        },
      },
      x: {
        _validate: () => 4,
      },
    },
  };
  const target = {
    a: { b: { c: null } },
  };
  const found = findAllRules(
    "_validate",
    target,
    rules,
  );
  assertEquals(found.length, 4);
  assertEquals(found[0]["_validate"]?.(context), 0);
  assertEquals(found[0].params, {});
  assertEquals(found[1]["_validate"]?.(context), 1);
  assertEquals(found[1].params, {});
  assertEquals(found[2]["_validate"]?.(context), 2);
  assertEquals(found[2].params, {});
  assertEquals(found[3]["_validate"]?.(context), 3);
  assertEquals(found[3].params, {});
});

Deno.test("[Rules _validate] findAllHelpers", () => {
  const rules = {
    _validate: () => 0,
    $a: {
      _validate: () => 1,

      $b: {
        _validate: () => 2,
        c: {
          _validate: () => 3,
        },
      },
      x: {
        _validate: () => 4,
      },
    },
  };
  const target = {
    a: { b: { c: null } },
  };
  const found = findAllRules(
    "_validate",
    target,
    rules,
  );
  assertEquals(found.length, 4);
  assertEquals(found[0]["_validate"]?.(context), 0);
  assertEquals(found[0].params, {});
  assertEquals(found[1]["_validate"]?.(context), 1);
  assertEquals(found[1].params, { $a: "a" });
  assertEquals(found[2]["_validate"]?.(context), 2);
  assertEquals(found[2].params, { $a: "a", $b: "b" });
  assertEquals(found[3]["_validate"]?.(context), 3);
  assertEquals(found[3].params, { $a: "a", $b: "b" });
});

Deno.test("[Rules _validate] findAllHelpers 2", () => {
  const rules = {
    _write: () => true,
    _read: () => true,
    $i: {
      _transform: () => 1,
    },
  };
  const target = {
    a: { b: { c: null } },
  };
  const found = findAllRules(
    "_transform",
    target,
    rules,
  );
  assertEquals(found.length, 1);
  assertEquals(found[0]["_transform"]?.(context), 1);
  assertEquals(found[0].params, { $i: "a" });
});

Deno.test("[Rules _validate] findAllHelpers with required path", () => {
  const rules = {
    _validate: () => 0,
    $a: {
      _validate: () => 1,

      $b: {
        _validate: () => 2,
        c: {
          _validate: () => 3,
        },
      },
      x: {
        _validate: () => 4,
        c: {
          _validate: () => 5,
        },
      },
    },
  };
  const target = {
    a: { x: { c: null } },
  };
  const found = findAllRules(
    "_validate",
    target,
    rules,
  );
  assertEquals(found.length, 4);
  assertEquals(found[0]["_validate"]?.(context), 0);
  assertEquals(found[0].params, {});
  assertEquals(found[1]["_validate"]?.(context), 1);
  assertEquals(found[1].params, { $a: "a" });
  assertEquals(found[2]["_validate"]?.(context), 4);
  assertEquals(found[2].params, { $a: "a" });
  assertEquals(found[3]["_validate"]?.(context), 5);
  assertEquals(found[3].params, { $a: "a" });
});

Deno.test("[Rules _validate] findAllRules", () => {
  const rules = {
    a: {
      $x: {
        _validate: () => true,
      },
    },
  };
  const target = { a: { b: 1, c: 2 } };
  const found = findAllRules(
    "_validate",
    target,
    rules,
  );
  assertEquals(found[0].params, { $x: "b" });
  assertEquals(found[1].params, { $x: "c" });
});

Deno.test("[Rules _validate] findAllRules", () => {
  const rules = {
    a: {
      $x: {
        _validate: () => true,
      },
    },
  };
  const target = { a: { b: 1, c: 2 } };
  const found = findAllRules(
    "_validate",
    target,
    rules,
  );
  assertEquals(found[0].params, { $x: "b" });
  assertEquals(found[1].params, { $x: "c" });
});

Deno.test({
  name: "[Helpers] findAllRules deeper rules",
  fn: () => {
    const trueFn = () => true;
    const rules = {
      _readAs: trueFn,
      $x: {
        _readAs: trueFn,
        b: {
          _readAs: trueFn,
        },
      },
    };
    assertEquals(
      findAllRules("_readAs", { a: { b: { c: 1 } } }, rules, ["a", "b"]),
      [{
        _readAs: trueFn,
        rulePath: ["a", "b"],
        params: { $x: "a" },
      }],
    );
    assertEquals(
      findAllRules("_readAs", { a: { b: { c: 1 } } }, rules, ["a"]),
      [{
        _readAs: trueFn,
        rulePath: ["a"],
        params: { $x: "a" },
      }, {
        _readAs: trueFn,
        rulePath: ["a", "b"],
        params: { $x: "a" },
      }],
    );
  },
});

Deno.test({
  // only: true,
  name: "[Helpers] findRulesOnPath",
  fn: () => {
    const rules = {
      people: {
        $name: {
          age: {
            _read: () => true,
          },
        },
      },
    };
    const found = findRulesOnPath(
      ["people", "garn", "age"],
      "_read",
      rules,
    );

    assertEquals(found.length, 1);
    assertEquals(found[0].params.$name, "garn");
    assertEquals(found[0].rulePath, ["people", "garn", "age"]);
    assertEquals(found[0]._read?.(context), true);
  },
});

Deno.test({
  // only: true,
  name: "[Helpers] findRulesOnPath not found",
  fn: () => {
    const rules = {
      people: {
        $name: {
          _read: () => true,
        },
      },
    };

    const found = findRulesOnPath(
      ["404", "garn", "age"],
      "_read",
      rules,
    );
    assertEquals(found.length, 0);
  },
});

Deno.test(
  {
    // only: true,
    name: "[Helpers] findRulesOnPath multiple rules",
    fn: () => {
      const rules = {
        _read: () => 0,
        people: {
          _read: () => 1,
          $name: {
            _read: () => 2,
            age: {
              _read: () => 3,
            },
          },
        },
      };
      const found = findRulesOnPath(
        ["people", "garn", "age"],
        "_read",
        rules,
      );
      assertEquals(found.length, 4);

      assertEquals(found[0]._read(context), 0);
      assertEquals(found[0].params, {});
      assertEquals(found[0].rulePath, []);

      assertEquals(found[1]._read(context), 1);
      assertEquals(found[1].params, {});
      assertEquals(found[1].rulePath, ["people"]);

      assertEquals(found[2]._read(context), 2);
      assertEquals(found[2].params, { $name: "garn" });
      assertEquals(found[2].rulePath, ["people", "garn"]);

      assertEquals(found[3]._read(context), 3);
      assertEquals(found[3].params, { $name: "garn" });
      assertEquals(found[3].rulePath, ["people", "garn", "age"]);
    },
  },
);

Deno.test(
  {
    // only: true,
    name: "[Helpers] findRulesOnPath multiple rules",
    fn: () => {
      const rules = {
        _read: () => 0,
        people: {
          _write: () => 1,
        },
      };
      const found = findRulesOnPath(
        ["people", "garn"],
        "_read",
        rules,
      );
      assertEquals(found.length, 1);
      assertEquals(found[0]._read(context), 0);
      assertEquals(found[0].params, {});
      assertEquals(found[0].rulePath, []);
    },
  },
);

Deno.test(
  {
    // only: true,
    name: "[Helpers] findRulesOnPath multiple rules",
    fn: () => {
      const rules = {
        _read: () => 0,
        people: {
          _write: () => 1,
          $name: {
            _write: () => 1,
            age: {
              _read: () => 1,
            },
          },
        },
      };
      const found = findRulesOnPath(
        ["people", "garn", "age", "else"],
        "_read",
        rules,
      );
      assertEquals(found.length, 2);
    },
  },
);

Deno.test(
  {
    // only: true,
    name: "[Helpers] findRulesOnPath stops quick",
    fn: () => {
      const rules = {
        _read: () => 0,
        people: {
          _write: () => 1,
          $name: {
            _write: () => 1,
            age: {
              _read: () => 1,
            },
          },
        },
      };
      const found = findRulesOnPath(
        [],
        "_read",
        rules,
      );
      assertEquals(found.length, 1);
    },
  },
);

Deno.test(
  {
    // only: true,
    name: "[Helpers] findRulesOnPath stops quick",
    fn: () => {
      const rules = {
        _read: () => 0,
      };
      const found = findRulesOnPath(
        ["people", "garn", "age", "else"],
        "_read",
        rules,
      );
      assertEquals(found.length, 1);
    },
  },
);

Deno.test(
  {
    // only: true,
    name: "[Helpers] findRulesOnPath multiple path",
    fn: () => {
      const rules = {
        providers: {
          $name: {
            age: {
              _read: () => 0,
            },
          },
        },
        $foo: {
          $bar: {
            age: { _read: () => 2 },
          },
        },
      };
      const found = findRulesOnPath(
        ["providers", "garn", "age"],
        "_read",
        rules,
      );

      assertEquals(found.length, 1);
      assertEquals(found[0]._read(context), 0);
      assertEquals(found[0].params, { $name: "garn" });
      assertEquals(found[0].rulePath, ["providers", "garn", "age"]);
    },
  },
);

Deno.test(
  {
    // only: true,
    name: "[Helpers] findRulesOnPath multiple path",
    fn: () => {
      const rules = {
        providers: {
          $name: {
            age: {
              _read: () => 0,
            },
          },
        },
        $foo: {
          $bar: {
            age: { _read: () => 2 },
          },
        },
      };
      const found = findRulesOnPath(
        ["users", "garn", "age"],
        "_read",
        rules,
      );

      assertEquals(found.length, 1);
      assertEquals(found[0]._read(context), 2);
      assertEquals(found[0].params, { $foo: "users", $bar: "garn" });
      assertEquals(found[0].rulePath, ["users", "garn", "age"]);
    },
  },
);

// const context = { data: "bar", params: {}, newData: undefined, rootData: {} };

// Deno.test("[Helpers] findDeepestRule basic", () => {
//   const rules = {
//     people: {
//       $name: {
//         _read: () => true,
//       },
//     },
//   };
//   const found = findDeepestRule(
//     ["people", "garn", "age"],
//     "_read",
//     rules,
//   );

//   assertEquals(found.params.$name, "garn");
//   assertEquals(found._read?.(context), true);
// });

// Deno.test("[Helpers] findDeepestRule not found", () => {
//   const rules = {
//     people: {
//       $name: {
//         _read: () => true,
//       },
//     },
//   };

//   const notFound = findDeepestRule(
//     ["404", "garn", "age"],
//     "_read",
//     rules,
//   );
//   assertEquals(notFound.params, {});
//   assertEquals(notFound._read, undefined);
//   assertEquals(notFound, {
//     params: {},
//     _read: undefined,
//     rulePath: [],
//   });
// });

// Deno.test(
//   "[Helpers] findDeepestRule multiple rules",
//   () => {
//     const rules = {
//       _read: () => 0,
//       people: {
//         _read: () => 1,
//         $name: {
//           _read: () => 2,
//           age: {
//             _read: () => 3,
//           },
//         },
//       },
//     };
//     const found = findDeepestRule(
//       ["people", "garn", "age"],
//       "_read",
//       rules,
//     );
//     assertEquals(found._read?.(context), 3);
//     assertEquals(found.params, { $name: "garn" });
//   },
// );

// Deno.test("[Helpers] findDeepestRule root rule", () => {
//   const rules = {
//     _read: () => 0,
//     people: {
//       $name: {
//         age: {
//           ups: {
//             _read: () => 1,
//           },
//         },
//       },
//     },
//   };
//   const found = findDeepestRule(
//     ["people", "garn", "age"],
//     "_read",
//     rules,
//   );
//   assertEquals(found._read?.(context), 0);
//   assertEquals(found.params, { $name: "garn" });
// });

// Deno.test("[Helpers] findDeepestRule two ways", () => {
//   const rules = {
//     providers: {
//       $name: {
//         age: {
//           _read: () => 1,
//         },
//       },
//     },
//     $foo: {
//       $bar: {
//         age: { _read: () => 2 },
//       },
//     },
//   };
//   const first = findDeepestRule(
//     ["providers", "garn", "age"],
//     "_read",
//     rules,
//   );

//   assertEquals(first.params, { $name: "garn" });
//   assertEquals(first._read?.(context), 1);
//   const second = findDeepestRule(
//     ["clients", "garn", "age"],
//     "_read",
//     rules,
//   );
//   assertEquals(second.params, { $foo: "clients", $bar: "garn" });
//   assertEquals(second._read?.(context), 2);
// });
