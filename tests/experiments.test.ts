import { StoreJson } from '../src/StoreJson.ts';
import { existsSync } from '../src/deps.ts';
import { deepSet } from '../src/helpers.ts';
import { assertEquals, assertThrows } from './test_deps.ts';
const testStorePath = './borra.json';

// Persistance StoreJson
////////////////////////
// Deno.test('[experiments] Set', () => {
//   const db = new StoreJson(testStorePath);
//   const set = new Set([1, 2, 3])
//   db.set('mySet', set);
//   const mySet = db.get('mySet');
//   console.log(mySet);

//   assertEquals(mySet.has(1), true);

//   db.set('myFunction', () => 1);
//   const myFunction = db.get('myFunction');
//   assertEquals(myFunction(), 1);

//   const symbol = Symbol('hola');
//   db.set('mySymbol', symbol);
//   const mySymbol = db.get('mySymbol');
//   assertEquals(mySymbol, symbol);

//   // db.write();
// });

// Deno.test('[fix] setting arrays', () => {

//   const data = {} as any;
//   deepSet(data, 'a.0.b', 1);
//   console.log(data);

//   assertEquals(data.a, [{b:1}]);
//   assertEquals(Array.isArray(data.a),true);
// });

// Deno.test("[experiments] Set", () => {
//     const db = new StoreJson(testStorePath);

//     const mySet = db.get("mySet");

//     // db.write();

//     assertEquals(mySet.has(1), true);

//   });
