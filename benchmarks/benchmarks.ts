import {
  bench,
  runBenchmarks,
} from "https://deno.land/std@0.93.0/testing/bench.ts";

import { StoreJson } from "../src/StoreJson.ts";
// import { Store } from "../src/Store.ts";
// const testStorePath = "./bench.store.json";

bench({
  name: "set 1e5 children",
  runs: 1,
  func(b): void {
    const db = new StoreJson({ filename: "./bench.1e5.store.json" });
    b.start();
    for (let i = 0; i < 1e5; i++) {
      db.set("item" + i, i);
    }
    b.stop();
    db.write();
  },
});

bench({
  name: "load 1e5 children",
  runs: 1,
  func(b): void {
    b.start();
    new StoreJson({ filename: "./bench.1e5.store.json" });
    b.stop();
  },
});

bench({
  name: "write 1e5 children",
  runs: 1,
  func(b): void {
    const db = new StoreJson({ filename: "./bench.1e5.store.json" });
    b.start();
    db.write();
    b.stop();
  },
});

bench({
  name: "get 1e5 children",
  runs: 1,
  func(b): void {
    const db = new StoreJson({ filename: "./bench.1e5.store.json" });
    b.start();
    for (let i = 0; i < 1e5; i++) {
      db.get("item" + i);
    }
    b.stop();
  },
});

bench({
  name: "get 1e5 runs",
  runs: 1e5,
  func(b): void {
    const db = new StoreJson({ filename: "./bench.1e5.store.json" });
    b.start();
    db.get("item0");
    b.stop();
  },
});

const r = await runBenchmarks({
  // skip: /set/ ,
  // only: /set/,
});

const dbResults = new StoreJson({
  filename: "./bench.results.store.json",
  autoSave: true,
  rules: {
    results: {
      _read: () => true,
      _write: ({ data }) => {
        console.log(data);

        return !data;
      },
      $i: {
        _write: () => true,
      },
    },
  },
});
try {
  dbResults.set("results", []);
} catch (error) {
  console.log(error);
}
dbResults.push("results", ...r.results);
