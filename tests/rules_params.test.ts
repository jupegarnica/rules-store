import { Store } from '../src/Store.ts';
import { RuleContext } from '../src/types.ts';
import { assertEquals } from './test_deps.ts';

Deno.test('[Rules params] get', () => {
  let calls = 0;
  const rules = {
    people: {
      $name: {
        _read: (context: RuleContext) => {
          calls++;
          assertEquals(context.params.name, 'garn');
        },
      },
    },
  };
  const db = new Store({ rules });
  db.set('people', { garn: { age: 1 }, pepe: { age: 2 } });

  assertEquals(db.get('people.garn.age'), 1);
  assertEquals(calls, 1);
  // throw new Error("ups");
});
