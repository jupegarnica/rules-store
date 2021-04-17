import { Store } from '../src/Store.ts';
import { RuleContext } from "../src/types.ts";
import { assertEquals } from './test_deps.ts';

Deno.test('[Rules params] get', () => {
  const rules = {
    people: {
      $name: {
        _read: (context: RuleContext) => console.log(context.params.name)
        ,
      },
    },
  };
  const db = new Store({ rules });
  db.set('people', { garn: { age: 1 }, pepe: { age: 2 } });

  assertEquals(db.get('people.garn.age'), 1);
  throw new Error("ups");

});
