import {
  bench,
  runBenchmarks,
} from "https://deno.land/std@0.93.0/testing/bench.ts";
import type {
  BenchmarkRunOptions,
  BenchmarkRunProgress,
} from "https://deno.land/std@0.93.0/testing/bench.ts";

import { duration } from "https://deno.land/x/tims/mod.ts";
import * as colors from "https://deno.land/std@0.93.0/fmt/colors.ts";
import { StoreJson } from "../src/StoreJson.ts";
import { StoreYaml } from "../src/StoreYaml.ts";
import { StoreBson } from "../src/StoreBson.ts";

const RUNS = Number(Deno.args[0]) ||
1e4;

1e3;
1e5;

3e6;
1e7;
1e6;

const resultsOptions = {
  filename: `./results.json`,
  autoSave: true,
};
const benchOptions: [
  BenchmarkRunOptions,
  ((progress: BenchmarkRunProgress) => void | Promise<void>),
] = [{
  // skip: /Yaml/i,
  skip: /(autoSave)|(Bson)/i,
  // only: /BSON/,
  // only: /Set/,
  // only: /\[Set\]/,
  // only: /Write/,
  // only: /Load/,
  // only: /(Load)|(Write)/,
  only: /(Get)|(Set)|(Load)|(Write)/,
  // only: /(Find)|(FindOne)|(Set)/,
  // only: /(BSON)|(JSON)/i,
  // silent: true,
}, () => {} // (p: BenchmarkRunProgress) => {
  // initial progress data

  // console.log(p.state);
  // if (p.state === ProgressState.BenchmarkingStart) {
  //   console.log(
  //     `Starting benchmarking. Queued: ${p.queued?.length}, filtered: ${p.filtered}`,
  //   );
  // }
  // }
];
const d = (time: number):string => {
  if (time > 5000) {
    return duration(time, { format: "second", locale: "en" });
  }
  return time.toFixed(2);
};
const toOpsEverySecond = (timeInMs:number, ops:number)=> ops * 1000 / timeInMs


const db = new StoreJson({ filename: `./data/${RUNS}.json` });
// SET
//////

bench({
  name: `[Set] ${RUNS} children`,
  runs: 1,
  func(b): void {
    b.start();
    for (let i = 0; i < RUNS; i++) {
      db.set(`item` + i, {i:{i:{i}}});
    }
    b.stop();
    db.write();
  },
});
bench({
  name: `[Set Bson]  ${RUNS} children`,
  runs: 1,
  func(b): void {
    const db = new StoreBson({
      filename: `./data/${RUNS}.bson`,
    });
    b.start();
    for (let i = 0; i < RUNS; i++) {
      db.set(`item` + i, {i:{i:{i}}});
    }
    b.stop();
    db.write();
  },
});


bench({
  name: `[Set Yaml] ${RUNS} children`,
  runs: 1,
  func(b): void {
    const db = new StoreYaml({
      filename: `./data/${RUNS}.yaml`,
    });
    b.start();
    for (let i = 0; i < RUNS; i++) {
      db.set(`item` + i, {i:{i:{i}}});
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
      filename: `./data/${RUNS}.json`,
      autoSave: true,
    });
    b.start();
    for (let i = 0; i < RUNS; i++) {
      db.set(`item` + i, {i:{i:{i}}});
    }
    b.stop();
  },
});

bench({
  name: `[Set Bson] autoSave  ${RUNS} children`,
  runs: 1,
  func(b): void {
    const db = new StoreBson({
      filename: `./data/${RUNS}.bson`,
      autoSave: true,
    });
    b.start();
    for (let i = 0; i < RUNS; i++) {
      db.set(`item` + i, {i:{i:{i}}});
    }
    b.stop();
  },
});

bench({
  name: `[Set Yaml] autoSave ${RUNS} children`,
  runs: 1,
  func(b): void {
    const db = new StoreYaml({
      filename: `./data/${RUNS}.yaml`,
      autoSave: true,
    });
    b.start();
    for (let i = 0; i < RUNS; i++) {
      db.set(`item` + i, {i:{i:{i}}});
    }
    b.stop();
    db.write();
  },
});

// Get
//////

bench({
  name: `[GetAll] assert ${RUNS} children`,
  runs: 1,
  func(b): void {
    b.start();
    const all = db.get(``);
    b.stop();
    const length = Object.keys(all).length;
    if (length !== RUNS) {
      throw new Error(`not ${RUNS} children, ${length}`);
    }
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

// bench({
//   name: `[Get] ${RUNS} runs`,
//   runs: RUNS,
//   func(b): void {
//     b.start();
//     db.get(`item0`);
//     b.stop();
//   },
// });

// Find
//////

bench({
  name: `[Find] ${RUNS} children reading value`,
  runs: 1,
  func(b): void {
    b.start();
    const results = db.find("", ([,value]) => value );
    b.stop();
    if (results.length !== RUNS) {
      throw new Error(`not ${RUNS} children, ${results.length}`);
    }
  },
});

bench({
  name: `[Find] ${RUNS} children without reading value`,
  runs: 1,
  func(b): void {
    b.start();
    const results = db.find("", () => true);
    b.stop();
    if (results.length !== RUNS) {
      throw new Error(`not ${RUNS} children, ${results.length}`);
    }
  },
});

// Load
//////

bench({
  name: `[Load Json]  once ${RUNS} children`,
  runs: 1,
  func(b): void {
    b.start();
    new StoreJson({ filename: `./data/${RUNS}.json` });
    b.stop();
  },
});

// bench({
//   name: `[Load Json] ${RUNS} times`,
//   runs: 1,
//   func(b): void {
//     b.start();
//     for (let i = 0; i < RUNS; i++) {
//       new StoreJson({ filename: `./data/${RUNS}.json` });
//     }
//     b.stop();
//   },
// });

// bench({
//   name: `[Load Json] ${RUNS} runs`,
//   runs: RUNS,
//   func(b): void {
//     b.start();
//     new StoreJson({ filename: `./data/${RUNS}.json` });
//     b.stop();
//   },
// });

bench({
  name: `[Load Bson]  once ${RUNS} children`,
  runs: 1,
  func(b): void {
    b.start();
    new StoreBson({ filename: `./data/${RUNS}.bson` });
    b.stop();
  },
});

// bench({
//   name: `[Load Bson] ${RUNS} times`,
//   runs: 1,
//   func(b): void {
//     b.start();
//     for (let i = 0; i < RUNS; i++) {
//       new StoreBson({ filename: `./data/${RUNS}.bson` });
//     }
//     b.stop();
//   },
// });

// bench({
//   name: `[Load Bson] ${RUNS} runs`,
//   runs: RUNS,
//   func(b): void {
//     b.start();
//     new StoreBson({ filename: `./data/${RUNS}.bson` });
//     b.stop();
//   },
// });

bench({
  name: `[Load Yaml]  once ${RUNS} children`,
  runs: 1,
  func(b): void {
    b.start();
    new StoreYaml({ filename: `./data/${RUNS}.yaml` });
    b.stop();
  },
});

// bench({
//   name: `[Load Yaml] ${RUNS} times`,
//   runs: 1,
//   func(b): void {
//     b.start();
//     for (let i = 0; i < RUNS; i++) {
//       new StoreYaml({ filename: `./data/${RUNS}.yaml` });
//     }
//     b.stop();
//   },
// });

// bench({
//   name: `[Load Yaml] ${RUNS} runs`,
//   runs: RUNS,
//   func(b): void {
//     b.start();
//     new StoreYaml({ filename: `./data/${RUNS}.yaml` });
//     b.stop();
//   },
// });

// Write
////////

bench({
  name: `[Write Json]  once ${RUNS} children`,
  runs: 1,
  func(b): void {
    const db = new StoreJson({ filename: `./data/${RUNS}.json` });
    b.start();
    db.write();
    b.stop();
  },
});

// bench({
//   name: `[Write Json] ${RUNS} times`,
//   runs: 1,
//   func(b): void {
//     new StoreJson({ filename: `./data/${RUNS}.json` });
//     b.start();
//     for (let i = 0; i < RUNS; i++) {
//       db.write();
//     }
//     b.stop();
//   },
// });

bench({
  name: `[Write Bson]  once ${RUNS} children`,
  runs: 1,
  func(b): void {
    const db = new StoreBson({ filename: `./data/${RUNS}.bson` });
    b.start();
    db.write();
    b.stop();
  },
});

// bench({
//   name: `[Write Bson] ${RUNS} times`,
//   runs: 1,
//   func(b): void {
//     new StoreBson({ filename: `./data/${RUNS}.bson` });
//     b.start();
//     for (let i = 0; i < RUNS; i++) {
//       db.write();
//     }
//     b.stop();
//   },
// });

bench({
  name: `[Write Yaml]  once ${RUNS} children`,
  runs: 1,
  func(b): void {
    const db = new StoreYaml({ filename: `./data/${RUNS}.yaml` });
    b.start();
    db.write();
    b.stop();
  },
});

// bench({
//   name: `[Write Yaml] ${RUNS} times`,
//   runs: 1,
//   func(b): void {
//     new StoreYaml({ filename: `./data/${RUNS}.yaml` });
//     b.start();
//     for (let i = 0; i < RUNS; i++) {
//       db.write();
//     }
//     b.stop();
//   },
// });

const { results } = await runBenchmarks(...benchOptions);

const dbResults = new StoreJson(resultsOptions);

for (const result of results) {
  const { name, runsCount, measuredRunsAvgMs } = result;
  dbResults.set(
    `results/${name}`,
    (old: { [k: string]: number }) => {
      // const lastOld = old?.lastRun ?? 0;
      const totalRunsOld = old?.totalRuns ?? 0;
      const averageRunOld = old?.averageRun ?? 0;
      const totalRuns = (totalRunsOld) + runsCount;

      const averageRun = ((averageRunOld * totalRunsOld) +
        (measuredRunsAvgMs * runsCount)) / totalRuns;

      const diff = measuredRunsAvgMs - averageRun;
      const diffRatio = measuredRunsAvgMs / averageRun;
      const improvement = -(1 - diffRatio);

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
        colors.bold(imp),
        " ".repeat((9 - text.length)),
        colors.yellow('x'+diffRatio.toFixed(2)),
        colors.bold(colors.blue(d(measuredRunsAvgMs))),
        colors.white(`${toOpsEverySecond(measuredRunsAvgMs, RUNS).toFixed(0) }o/s`) ,
        colors.blue(d(averageRun)),
        colors.brightWhite(`${toOpsEverySecond(averageRun, RUNS).toFixed(0) }o/s`) ,
      );
      console.groupEnd();

      return data;
    },
  );
}
