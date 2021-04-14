import { StoreJson } from '../src/StoreJson.ts';
import { existsSync } from '../src/deps.ts';
import { assertEquals, assertThrows } from './test_deps.ts';
const testStorePath = './borra.json';

// Persistance StoreJson
////////////////////////
Deno.test('[experiments] Set', () => {
  const db = new StoreJson(testStorePath);

  db.set('mySet', new Set([1, 2, 3]));
  const mySet = db.get('mySet');
  assertEquals(mySet.has(1), true);

  db.set('myFunction', () => 1);
  const myFunction = db.get('myFunction');
  assertEquals(myFunction(), 1);

  const symbol = Symbol('hola');
  db.set('mySymbol', symbol);
  const mySymbol = db.get('mySymbol');
  assertEquals(mySymbol, symbol);

  // db.write();
});

// Deno.test("[experiments] Set", () => {
//     const db = new StoreJson(testStorePath);

//     const mySet = db.get("mySet");

//     // db.write();

//     assertEquals(mySet.has(1), true);

//   });
