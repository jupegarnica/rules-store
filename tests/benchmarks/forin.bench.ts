// deno run -A --unstable --watch --no-check tests/benchmarks/forin.bench.ts

import {
  bench,
  runBenchmarks,
} from "https://deno.land/std@0.93.0/testing/bench.ts";

// import type {
//   BenchmarkRunOptions,
//   BenchmarkRunProgress,
// } from "https://deno.land/std@0.93.0/testing/bench.ts";

// import { duration } from "https://deno.land/x/tims/mod.ts";
// import * as colors from "https://deno.land/std@0.93.0/fmt/colors.ts";
// import { StoreYaml } from "../../src/StoreYaml.ts";
// import { StoreBson } from "../../src/StoreBson.ts";
// import { KeyValue } from "../../src/types.ts";

const RUNS = 1e6;
const object = {} as { [key: string]: number };
for (let index = 0; index < RUNS; index++) {
  object[`i${index}`] = index;
}

bench({
  name: `[FOR IN] ${RUNS}`,
  runs: 1,
  func(b): void {
    b.start();
    for (const key in object) {
      object[key];
    }
    b.stop();
  },
});
bench({
  name: `[FOR IN] hasOwnProperty.call ${RUNS}`,
  runs: 1,
  func(b): void {
    b.start();
    for (const key in object) {
      if (Object.prototype.hasOwnProperty.call(object, key)) {
        object[key];
      }
    }
    b.stop();
  },
});

bench({
  name: `[FOR IN] hasOwnProperty ${RUNS}`,
  runs: 1,
  func(b): void {
    b.start();
    for (const key in object) {
      if (object.hasOwnProperty(key)) {
        object[key];
      }
    }
    b.stop();
  },
});
bench({
  name: `[FOR of Object.keys] ${RUNS}`,
  runs: 1,
  func(b): void {
    b.start();
    const keys = Object.keys(object);
    for (const key of keys) {
      object[key];
    }
    b.stop();
  },
});

bench({
  name: `[forEach Object.keys] ${RUNS}`,
  runs: 1,
  func(b): void {
    b.start();
    const keys = Object.keys(object);
    keys.forEach((key) => {
      object[key];
    });
    b.stop();
  },
});

bench({
  name: `[for Object.keys] ${RUNS}`,
  runs: 1,
  func(b): void {
    b.start();
    const keys = Object.keys(object);
    for (let index = 0; index < keys.length; index++) {
      keys[index];
    }
    b.stop();
  },
});

bench({
  name: `[while Object.keys] ${RUNS}`,
  runs: 1,
  func(b): void {
    b.start();
    const keys = Object.keys(object);
    let index = keys.length;
    while (index--) {
      keys[index];
    }
    b.stop();
  },
});

await runBenchmarks();
