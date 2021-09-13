import * as colors from "https://deno.land/std@0.93.0/fmt/colors.ts";

const watcher = Deno.watchFs(".");
let cmd =
  "deno test --no-check --allow-read --allow-write --unstable --location=http://localhost:1357"
    .split(
      " ",
    );
cmd = cmd.concat(Deno.args);

let running = false;
const run = async () => {
  const p = Deno.run({ cmd });
  running = true;
  const { success, code } = await p.status();
  p.close();
  const colorize = success ? colors.brightGreen : colors.brightRed;
  console.info(
    colorize(
      `Exit code ${code}
--------------`,
    ),
  );
  running = false;
};

run();
for await (const event of watcher) {
  // console.log(">>>> event", event);
  // { kind: "create", paths: [ "/foo.txt" ] }
  // console.log("run test", event);
  if (event.kind === "access") {
    if (event.paths.some((path: string) => path.match(/\.ts$/))) {
      !running && await run();
    }
  }
}

// import { deepSet } from "../helpers.ts";
// import { Store } from "../Store.ts";
// import { assertEquals, assertThrows } from "./test_deps.ts";
// // import type { RuleContext } from "../types.ts";
// // import { ValidationError } from "../Errors.ts";
// const db = new Store();
// // db.set("a.b", { c:0, d:0 } );
// db.set("a.b", { c:0 } );

// let called = 0;
// const onChange = (data: any) => {
//   console.log({cbData:data});
//   called++;
//   assertEquals(data.c, 1);
//   // data.c = 2;
//   // assertEquals(data.c, 2);

// };
// db.observe("a.b", onChange);

// assertEquals(called, 0);
// db.set("a.b.c", 1);
// assertEquals(called, 1);
// console.log(db.get(''));
// // assertEquals(db.get('a.b.c'), 1);
// // db.set("a.b.d", 1);
// // assertEquals(called, 2);
// // assertEquals(db.get('a.b.c'), 1);
