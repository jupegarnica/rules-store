import { findParam, isObject } from '../src/helpers.ts';
import { Store } from '../src/Store.ts';
import { RuleContext } from '../src/types.ts';
import { assertEquals } from './test_deps.ts';

function findRuleAndParams(keys: string[], ruleType: string, rules: any) {
  const params: any = {};
  let worker = rules as any;
  let rule: any;

  for (const key of keys) {
    const child = worker[key];
    const maybeParam = findParam(worker);
    let maybeRule = worker[ruleType];
    if (maybeRule) rule = maybeRule;
    if (isObject(child)) {
      worker = child;
      maybeRule = worker[ruleType];
      if (maybeRule) rule = maybeRule;
    } else {
      if (maybeParam) {
        params[maybeParam.replace('$', '')] = key;
        worker = worker[maybeParam];
      } else {
        break;
      }
    }
  }
  return { params, [ruleType]: rule };
}

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

Deno.test('[Rules params] findRuleAndParams basic', () => {
  const rules = {
    people: {
      $name: {
        _read: () => true,
      },
    },
  };
  const found = findRuleAndParams(
    ['people', 'garn', 'age'],
    '_read',
    rules,
  );

  console.log({ found });

  assertEquals(found.params.name, 'garn');
  assertEquals(found._read(), true);
});

Deno.test('[Rules params] findRuleAndParams not found', () => {
  const rules = {
    people: {
      $name: {
        _read: () => true,
      },
    },
  };

  const notFound = findRuleAndParams(
    ['404', 'garn', 'age'],
    '_read',
    rules,
  );
  assertEquals(notFound.params, {});
  assertEquals(notFound._read, undefined);
  assertEquals(notFound, { params: {}, _read: undefined });
});

Deno.test('[Rules params] findRuleAndParams multiple rules', () => {
  const rules = {
    _read: () => 0,
    people: {
      _read: () => 1,
      $name: {
        _read: () => 2,
        age: {
          _read: () => 3,
        },
      },
    },
  };
  const found = findRuleAndParams(
    ['people', 'garn', 'age'],
    '_read',
    rules,
  );
  assertEquals(found._read(), 3);
  assertEquals(found.params, { name: 'garn' });
});

Deno.test('[Rules params] findRuleAndParams root rule', () => {
  const rules = {
    _read: () => 0,
    people: {
      $name: {
        age: {
          ups: {
            _read: () => 1,
          },
        },
      },
    },
  };
  const found = findRuleAndParams(
    ['people', 'garn', 'age'],
    '_read',
    rules,
  );
  assertEquals(found._read(), 0);
  assertEquals(found.params, { name: 'garn' });
});

Deno.test('[Rules params] findRuleAndParams two ways', () => {
  const rules = {
    providers: {
      $name: {
        age: {
          _read: () => 1,
        },
      },
    },
    $foo: {
      $bar: {
        age: { _read: () => 2 },
      },
    },
  };
  const found = findRuleAndParams(
    ['providers', 'garn', 'age'],
    '_read',
    rules,
  );

  assertEquals(found.params, { name: 'garn' });
  assertEquals(found._read(), 1);
  const notFound = findRuleAndParams(
    ['clients', 'garn', 'age'],
    '_read',
    rules,
  );
  assertEquals(notFound.params, { foo: 'clients', bar: 'garn' });
  assertEquals(notFound._read(), 2);
});
