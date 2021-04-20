import {
  bench,
  ProgressState,
  runBenchmarks,
} from "https://deno.land/std@0.93.0/testing/bench.ts";

import type {
  BenchmarkRunOptions,
  BenchmarkRunProgress,
} from "https://deno.land/std@0.93.0/testing/bench.ts";

import * as colors from "https://deno.land/std@0.93.0/fmt/colors.ts";
import { StoreJson } from "../src/StoreJson.ts";
import { StoreYaml } from "../src/StoreYaml.ts";
import { StoreBson } from "../src/StoreBson.ts";

const RUNS =
1e3;
1e2;
1e4;
1e5;
1e6;
1e7;

const resultsFilename = `./bench.results.store.json`
const options: [
  BenchmarkRunOptions,
  ((progress: BenchmarkRunProgress) => void | Promise<void>),
] = [{
  skip: /Yaml/i,
  // only: /BSON/,
  // only: /Set/,
  only: /\[Set\]/,
  // only: /Write/,
  // only: /Load/,
  // only: /(Load)|(Write)/,
  // only: /(BSON)|(JSON)/i,
  silent: true,
}, (p: BenchmarkRunProgress) => {
  // initial progress data

  // console.log(p.state);
  // if (p.state === ProgressState.BenchmarkingStart) {
  //   console.log(
  //     `Starting benchmarking. Queued: ${p.queued?.length}, filtered: ${p.filtered}`,
  //   );
  // }
}];
bench({
  name: `[Set Bson] autoSave  ${RUNS} children`,
  runs: 1,
  func(b): void {
    const db = new StoreBson({
      filename: `./bench.${RUNS}.store.bson`,
      autoSave: true,
    });
    b.start();
    for (let i = 0; i < RUNS; i++) {
      db.set(`item` + i, i);
    }
    b.stop();
    db.write();
  },
});
bench({
  name: `[Get Bson] ${RUNS} children`,
  runs: 1,
  func(b): void {
    const db = new StoreBson({
      filename: `./bench.${RUNS}.store.bson`,
      // autoSave: true,
    });
    b.start();
    for (let i = 0; i < RUNS; i++) {
      db.get(`item` + i);
    }
    b.stop();
  },
});

bench({
  name: `[Load Bson] ${RUNS} children`,
  runs: 1,
  func(b): void {
    b.start();
    new StoreBson({ filename: `./bench.${RUNS}.store.bson` });
    b.stop();
  },
});

bench({
  name: `[Write Bson] ${RUNS} children`,
  runs: 1,
  func(b): void {
    const db = new StoreBson({ filename: `./bench.${RUNS}.store.bson` });
    b.start();
    db.write();
    b.stop();
  },
});

bench({
  name: `[Set Yaml] autoSave ${RUNS} children`,
  runs: 1,
  func(b): void {
    const db = new StoreYaml({
      filename: `./bench.${RUNS}.store.yaml`,
      autoSave: true,
    });
    b.start();
    for (let i = 0; i < RUNS; i++) {
      db.set(`item` + i, i);
    }
    b.stop();
    db.write();
  },
});
bench({
  name: `[Set Json] autoSave ${RUNS} children`,
  runs: 1,
  func(b): void {
    const db = new StoreJson({
      filename: `./bench.${RUNS}.store.json`,
      autoSave: true,
    });
    b.start();
    for (let i = 0; i < RUNS; i++) {
      db.set(`item` + i, i);
    }
    b.stop();
    db.write();
  },
});

bench({
  name: `[Set] ${RUNS} children`,
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
  name: `[Set] ${RUNS} runs`,
  runs: RUNS,
  func(b): void {
    b.start();
    db.set(`item0`, 0);
    b.stop();
  },
});
bench({
  name: `[Get] ${RUNS} children`,
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
  name: `[Get] ${RUNS} runs`,
  runs: RUNS,
  func(b): void {
    b.start();
    db.get(`item0`);
    b.stop();
  },
});

bench({
  name: `[Load Json] ${RUNS} children`,
  runs: 1,
  func(b): void {
    b.start();
    new StoreJson({ filename: `./bench.${RUNS}.store.json` });
    b.stop();
  },
});

bench({
  name: `[Write Json] ${RUNS} children`,
  runs: 1,
  func(b): void {
    const db = new StoreJson({ filename: `./bench.${RUNS}.store.json` });
    b.start();
    db.write();
    b.stop();
  },
});

const { results } = await runBenchmarks(...options);

const dbResults = new StoreJson({
  filename: resultsFilename,
  autoSave: true,
});

for (const result of results) {
  const { name, runsCount, measuredRunsAvgMs } = result;
  dbResults.set(
    `results/${name}`,
    (old: { [k: string]: number }) => {
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
        colors.bold(imp),
      );
      console.groupEnd();

      return data;
    },
  );
}
