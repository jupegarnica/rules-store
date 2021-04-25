import { StoreJson } from "../src/StoreJson.ts";
import { debounce } from "../src/helpers.ts";
import { assertEquals, delay, Spy, spy } from "./test_deps.ts";
// import type { RuleContext } from "../src/types.ts";
// import { ValidationError } from "../src/Errors.ts";

const rules = {
  _write: () => true,
  _read: () => true,
  numbers: {
     $i:{
      _transform: ({ newData}) => Number(newData),
      _validate: ({newData}) => !Number.isNaN(newData),
     }
  }
}
const initialDataIfNoPersisted = {
  numbers: []
}
const db = new StoreJson({rules, initialDataIfNoPersisted})

db.push('number', '1');

assertEquals(db.get('number.0'), 1)