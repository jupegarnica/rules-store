import {
  bench,
  runBenchmarks,
} from "https://deno.land/std@0.93.0/testing/bench.ts";

import { StoreJson } from "../src/StoreJson.ts";
// import { Store } from `../src/Store.ts`;
// const testStorePath = `./bench.store.json`;

const RUNS = 1e3;

bench({
  name: `set ${RUNS} children`,
  runs: 1,
  func(b): void {
    const db = new StoreJson({ filename: `./bench.${RUNS}.store.json` });
    b.start();
    for (let i = 0; i < RUNS; i++) {
      db.set(`item` + i, i);
    }
    b.stop();
    db.write();
  },
});

bench({
  name: `load ${RUNS} children`,
  runs: 1,
  func(b): void {
    b.start();
    new StoreJson({ filename: `./bench.${RUNS}.store.json` });
    b.stop();
  },
});

bench({
  name: `write ${RUNS} children`,
  runs: 1,
  func(b): void {
    const db = new StoreJson({ filename: `./bench.${RUNS}.store.json` });
    b.start();
    db.write();
    b.stop();
  },
});

bench({
  name: `get ${RUNS} children`,
  runs: 1,
  func(b): void {
    const db = new StoreJson({ filename: `./bench.${RUNS}.store.json` });
    b.start();
    for (let i = 0; i < RUNS; i++) {
      db.get(`item` + i);
    }
    b.stop();
  },
});

const db = new StoreJson({ filename: `./bench.${RUNS}.store.json` });
bench({
  name: `get ${RUNS} runs`,
  runs: RUNS,
  func(b): void {
    b.start();
    db.get(`item0`);
    b.stop();
  },
});

const { results } = await runBenchmarks({
  // skip: /set/ ,
  // only: /set/,
});

const dbResults = new StoreJson({
  filename: `./bench.results.store.json`,
  autoSave: true,
  rules: {
    _write: () => true,
    _read: () => true,
    results: {
      $name: {
        runs: {
          _write: ({ data }) => {
            return !data || Array.isArray(data);
          },
        },
      },
    },
  },
});

for (const result of results) {
  const { name, runsCount, measuredRunsAvgMs } = result;
  try {
    dbResults.set(`results/${name}/runs`, []);
  } catch (error) {
    console.log(error.message);
  }

  dbResults.set(
    `results/${name}`,
    (old: any) => {
      const last = old.lastMeasuredRun ?? 0;
      const totalRunCounts = (old.totalRunCounts + runsCount) || runsCount;
      const diff = measuredRunsAvgMs - last;
      const diffRatio = measuredRunsAvgMs / last;
      const improvement = diff / measuredRunsAvgMs;

      const data = ({
        ...old,
        totalRunCounts,
        lastMeasuredRun: measuredRunsAvgMs,
        diff,
        diffRatio,
        improvement,
      });

      console.log(name,`${(data.improvement * 100).toFixed(2)}`);

      return data;
    },
  );
  dbResults.push(`results/${name}/runs`, {
    ...result,
    name: undefined,
    measuredRunsMs: undefined,
  });
}
