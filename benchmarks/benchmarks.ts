import {
  bench,
  runBenchmarks,
} from "https://deno.land/std@0.93.0/testing/bench.ts";

import * as colors from "https://deno.land/std@0.93.0/fmt/colors.ts";
import { StoreJson } from "../src/StoreJson.ts";
// import { Store } from `../src/Store.ts`;
// const testStorePath = `./bench.store.json`;

const RUNS =
1e3;
1e2;
1e4;
1e5;

bench({
  name: `[Set Get] set ${RUNS} children`,
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
const db = new StoreJson({ filename: `./bench.${RUNS}.store.json` });

bench({
  name: `[Set Get] set ${RUNS} runs`,
  runs: RUNS,
  func(b): void {
    b.start();
    db.set(`item0`, 0);
    b.stop();
  },
});
bench({
  name: `[Set Get] get ${RUNS} children`,
  runs: 1,
  func(b): void {
    b.start();
    for (let i = 0; i < RUNS; i++) {
      db.get(`item` + i);
    }
    b.stop();
  },
});

bench({
  name: `[Set Get] get ${RUNS} runs`,
  runs: RUNS,
  func(b): void {
    b.start();
    db.get(`item0`);
    b.stop();
  },
});

bench({
  name: `[Load Write] load ${RUNS} children`,
  runs: 1,
  func(b): void {
    b.start();
    new StoreJson({ filename: `./bench.${RUNS}.store.json` });
    b.stop();
  },
});

bench({
  name: `[Load Write] write ${RUNS} children`,
  runs: 1,
  func(b): void {
    const db = new StoreJson({ filename: `./bench.${RUNS}.store.json` });
    b.start();
    db.write();
    b.stop();
  },
});

const { results } = await runBenchmarks({
  // skip: /set/ ,
  // only: /Load.Write/,
  only: /Set.Get/,
  silent: true,
});

const dbResults = new StoreJson({
  filename: `./bench.results.store.json`,
  autoSave: true,
});

for (const result of results) {
  const { name, runsCount, measuredRunsAvgMs } = result;
  dbResults.set(
    `results/${name}`,
    (old:{[k:string]: number}) => {
      const lastOld = old?.lastRun ?? 0;
      const totalRunsOld = old?.totalRuns ?? 0;
      const totalRuns = (totalRunsOld) + runsCount;
      const diff = measuredRunsAvgMs - lastOld;
      const diffRatio = measuredRunsAvgMs / lastOld;
      const improvement = -(1 - diffRatio);
      const averageRunOld = old?.averageRun ?? 0;
      const averageRun = ((averageRunOld * totalRunsOld) +
        (measuredRunsAvgMs * runsCount)) / totalRuns;

      const data = ({
        totalRuns,
        lastRun: measuredRunsAvgMs,
        diff,
        diffRatio,
        improvement,
        averageRun,
      });

      const text = `${(data.improvement * 100).toFixed(2)}`;
      const imp = data.improvement > 0 ? colors.red(text) : colors.green(text);

      console.group(colors.dim(name));
      console.debug(
        colors.bold(colors.blue(measuredRunsAvgMs.toFixed(2))),
        colors.blue(averageRun.toFixed(2)),
        colors.yellow(diffRatio.toFixed(2)),
        colors.bold(imp) ,
      );
      console.groupEnd();

      return data;
    },
  );
}
