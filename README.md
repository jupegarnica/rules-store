# Rules Store

_An observable data store with persistence heavily inspired by firebase rules_

**Rules Store is about managing runtime data with security and confidence** writing rules which ensure all data is stored and read as expected. Maybe that sound familiar if you work with Databases, but it no usual talking about runtime state management.

The main motivation is to bring the databases developers' mindset to runtime state management.

## Getting Started

### CRUD operations

The main methods to read or write into the data store are

- `.get(path: string)`
- `.set(path: string, valueOrFunction: any)`
- `.remove(path: string)`

```ts
import { Store } from './core/Store.ts';
const store = new Store();

store.set('count', 1); // create data.count = 1
store.get('count'); // returns 1
store.set('count', 2); // update data.count = 2
store.get('elseWhere'); // returns undefined
store.remove('count'); // returns the value removed, 2
```

There are also more advance methods:

- `.push(path: string, ...values: any[])`
- `.find(path: string, finder: ([key, value]) => boolean)`
- `.findOne(path: string, finder: ([key, value]) => boolean)`
- `.findAndRemove(path: string, finder: ([key, value]) => boolean)`
- `.findOneAndRemove(path: string, finder: ([key, value]) => boolean)`
- `.findAndUpdate(path: string, finder: ([key, value]) => boolean, mapper: (data: any) => any )`
- `.findOneAndUpdate(path: string, finder: ([key, value]) => boolean, mapper: (data: any) => any )`

```ts
import { Store } from './core/Store.ts';
const store = new Store();
const db = new Store();
db.set('obj', { a: 1, b: 2, c: 3 });
db.find('obj', ([key, value]) => value > 1); // returns entries array [["b", 2], ["c", 3]]

db.findAndUpdate(
  'obj',
  ([, value]) => value > 1,
  ([, value]) => value * 2,
);
db.get('obj'); // returns { a: 1, b: 4, c: 6 }
```

### The path

The path can point as deep as needed using a slash `/` as separator.

```ts
import { Store } from './core/Store.ts';
const store = new Store();

store.set('counter/count', 1);
store.get('counter'); // returns { count:1 }
store.get('counter/count'); // returns 1
```

There is no relative path concept. The root path can be expressed as `"/"` or `""` (empty string).

So the path `"/counter/count"` is the same as `"counter/count"` , `"/counter/count/"` or `"counter/count/"`

```ts
store.get(''); // returns { counter: { count:1 } }
store.get('/'); // returns { counter: { count:1 } }
store.get('counter/count'); // returns 1
store.get('/counter/count/'); // returns 1
```

### Rules

Without some sort of restrictions the data store can be as chaotic as humans can be. That why rules come into play.

Javascript is as is. Dynamically typed languages are good for quick prototyping but hard to scale.

Following our counter example, nothing stops us to set the counter to any non numeric value or even a negative number. `store.set('counter/count', 'i am not a number')` doesn't make sense, but it is posible.

If you like, you can instantiate the store with a rules object in order the give permission to read or write at a given path. And transform or validate that the data will be stored conforming certain criteria.

```ts
import { Store } from './core/Store.ts';
const rules = {
  counter: {
    _write: () => true,
  },
};
const store = new Store({ rules });

store.set('counter/count', 1);
store.get('counter/count'); // throws PermissionError, 'Not explicit permission to read'
store.set('elseWhere', 1); // throws PermissionError, 'Not explicit permission to write'
```

There are 6 kinds of rules:

- `_write`: Allow permission to write a node and downstream.
- `_read`: Allow permission to read a node and downstream.
- `_validate`: Validate the data before to be written.
- `_transform`: Transform the data before been validated.
- `_writeAs`: Transform the data after been validated and before to be written.
- `_readAs`: Transform the data on get, but not real mutation will be made to the stored data.

```ts
import { Store } from './core/Store.ts';
const rules = {
  counter: {
    count: {
      _write: () => true,
      _read: () => false,
      _validate: (data) => Number.isInteger(data),
    },
  },
};
const store = new Store({ rules });

store.set('counter/count', 1); // ok
store.get('counter/count'); // throws PermissionError, 'read disallowed at path /counter/count'

store.set('counter/count', 1.5); // throws ValidationError, 'Validation fails at path /counter/count
store.set('counter/count', '1'); // throws ValidationError, 'Validation fails at path /counter/count
```

#### $param

It posible to use a dynamic key node starting the key with a `$`, the param matched can be read from the rule context in the second argument.

```ts
import { Store } from './core/Store.ts';
const rules = {
  $anything: {
    // allow to write if the key starts with an `A`
    _write: (_, { $anything }: RuleContext) =>
      $anything.charAt(0) === 'A',
  },
};
const store = new Store({ rules });

store.set('Ant', true); // ok
store.set('Bee', true); // throws PermissionError, 'write disallowed at path /Bee'
```

### Observe

Any path can be observed to make any logic when a certain node will change.

Use `.observe('path/to/observe', callback)`

```ts
const store = new Store();

store.observe('counter/count', (count) => {
  if (count > 3) {
    console.log(`count has reached ${data}`);
  }
});

store.set('counter/count', 3);
store.set('counter/count', 4); // logs 'count has reached 4'
```

It is also posible to observe dynamic paths using a `$param`. For example:

```ts
const store = new Store();

store.observe('array/$index', (item, { $index }) => {
  console.log(`index ${$index} has a ${item}`);
});

store.push('array', 3); // logs 'index 0 has a 3'
store.set('array/0', 4); // logs 'index 0 has a 4'
store.remove('array/0'); // logs 'index 0 has a undefined'
store.set('array/1/hello', 'world'); // logs 'index 1 has a { hello: 'world' }'

store.observe(
  'roles/$roleName/allowRead',
  (data, { $roleName }) => {
    console.log(`role ${$roleName} has allowRead to ${data}`);
  },
);
store.set('roles/admin/allowRead', true); // logs 'role admin has allowRead to true'
store.set('roles/editor', { id: 2, allowRead: false }); // logs 'role editor has allowRead to false'
```

### Persistance

The data store in the store can be persisted to Json, Yaml, LocalStorage, SessionStorage or as UrlSearch param.

Just import the one that fit your needs.

```ts
// Store has not persistance adapter
import { Store } from './core/Store.ts';

// StoreJson and StoreYaml, add persistance in deno
import { StoreJson } from './core/StoreJson.ts';
import { StoreYaml } from './core/StoreYaml.ts';

// StoreLocalStorage, StoreSessionStorage and StoreUrl, add persistance in the browser
import { StoreLocalStorage } from './core/StoreLocalStorage.ts';
import { StoreSessionStorage } from './core/StoreSessionStorage.ts';
import { StoreUrl } from './core/StoreUrl.ts';

const store = new StoreJson({ name: 'store.json' });
// will load data from './store.json' if the file exist

store.set('counter/count', 0);

store.persist();
// Synchronously updates or create a store.json file with  {"counter":{"count":0}}
```

#### AutoSave

If the config `autoSave` is set to true, every mutation will be lazily persisted. That means it will perform a debounced persist with a default timeout of 0. Can be changed with config.persistLazyDelay

And also exist a `.persistLazy()` method which returns `Promise<void>` resolved when the persistance will complete.

```ts
const store = new StoreJson({
  name: 'store.json',
  autoSave: true,
  // persistLazyDelay: 0,  default
});

store.set('a', 1); // will run this.persistLazy()
db.persistLazy().then(() => console.log('written to disk'));
db.persistLazy().then(() => console.log('written to disk'));

// only one write to disk will be done.
```

### Transactions

It can be tricky to undo some operations manually. So you can perform multiples operation as one transaction and finally commit all or rollback.

```ts
const store = new Store({ initialData: { count: 0 } });

try {
  store.beginTransaction();
  store.set('count', 1);
  store.set('elseWhere', true);
  store.commit();
} catch (error) {
  store.rollback();
}
```

## In depth

### Rules

#### RuleContext

All the rules will recibe two arguments.
The first one is a reference to the data written or read at that node. **So you should not mutate this argument**
And second one is a object context with the following properties:

```ts
export type RuleContext = {
  oldData: Value; // A getter to get cloned old data (the previous value at that path)
  newData: Value; // A getter to get cloned payload to be written.
  rootData: ObjectOrArray; // A getter to get cloned value from the root data
  _newData: Value; // A reference to the data written or read (same as first argument)
  _oldData: Value; // A reference to the old data
  _rootData: ObjectOrArray; // A reference to the root data
  isUpdate: boolean; // true if is performing an update
  isCreation: boolean; // true if is performing a creation
  isRemove: boolean; // true if is performing a deletion
  [$param: string]: string; // every dynamic params found up upstream.
};
```

```ts
import { Store } from './core/Store.ts';
const rules = {
  counter: {
    count: {
      _read: () => true,
      // only allow to update data
      _write: (_, { isUpdate }) => isUpdate,
      // validate the counter only increments by one
      _validate: (data, { oldData }) => data - oldData === 1,
    },
  },
};
const store = new Store({
  rules,
  initialData: { counter: { count: 0 } },
});

store.set('counter/count', 1); // ok
store.set('counter/count', 3); // throws ValidationError, 'Validation fails at path /counter/count
// deletion
store.set('counter/count', undefined); // throws PermissionError, 'write disallowed at path /counter/count'
```

#### Permissions \_write and \_read

`_write` and `_read` cascade, that means that the first rule found in the path will permit to write or read downstream.

```ts
import { Store } from './core/Store.ts';
const rules = {
  counter: {
    _write: () => true,
    count: {
      _write: () => false,
    },
  },
};
const store = new Store({
  rules,
});

store.set('counter/count', 1); // Ok, Permission allowed at /counter
```

The permission only will granted by founding a rule in the path. If not rule found it will disallow permission.

```ts
import { Store } from './core/Store.ts';
const store = new Store({
  rules: {},
});

store.set('counter/count', 1); // throws PermissionError, 'Not explicit permission to write'
```

The rules will be find only in the path, not in the payload.

```ts
import { Store } from './core/Store.ts';
const store = new Store({
  rules: {
    counter: {
      count: {
        _write: () => true,
      },
    },
  },
});

const payload = { count: 1 };
store.set('counter', payload); // throws PermissionError, 'Not explicit permission to write'
```

#### Validation \_validate

The rule \_validate should return a truthy value to allow write, or falsy to disallow. Or it's posible to throw your custom errors.

The rule `_validate` will validate the whole payload, and all the rules found in the path above.

**All the validations must pass in order to allow writing.**

```ts
import { Store } from './core/Store.ts';
const store = new Store({
  rules: {
    a: {
      b: {
        _validate: () => true,
        c: {
          _validate: () => true,
        },
        d: {
          _validate: () => false,
        },
      },
    },
  },
});

store.set('a/b', { c: 1 }); // ok, because _validation at /a/b/d won't run.
store.set('a/b', { c: 1, d: 2 }); // Throws ValidationError
```

In `store.set('a/b', { c: 1 })` example it will run the \_validate rule found at `/a/b` and `/a/b/c`, but not `/a/b/d`

#### Transformations \_transform \_writeAs \_readAs

`_readAs` will transform on getting, but will never mutate the stored data.
`_transform` will transform the payload before being validated.
`_writeAs_` will transform the payload after being validated.

```ts
import { Store } from './core/Store.ts';
const store = new Store({
  rules: {
    secret: {
      _transform: (password) => password.trim(),
      _validate: (password) => password.length >= 8,
      _writeAs: (password) => encrypt(password),
    },
  },
});

store.set('secret', '  12345678  '); // ok, returns encrypted password
store.set('secret', '  1234  '); // Throws ValidationError
```

```ts
import { Store } from './core/Store.ts';
const store = new Store({
  rules: {
    myDate: {
      _validate: () => (date: Value) => date instanceof Date,
      _writeAs_: (date: Value) => date.toISOString(),
      _readAs: (data: Value) => new Date(data),
    },
  },
});

store.set('myDate', '2021-01-30'); // Throws ValidationError
const date = new Date('1999-01-08T23:00:00.000Z');
store.set('myDate', date); // returns a date object,  but stores a date ISO string
```

# RoadMap

- [x] inmutable get and set
- [x] push multiple items
- [x] Set using a function. Ej. db.set('a', oldData => oldData + 1)
- [x] add config to instantiation: filename, folder, autoSave
- [x] .observe()
- [x] find, findOne, findAndRemove, findOneAndRemove
- [x] rules write and read
- [x] performance benchmarks
- [x] rule \_validate
- [x] rule \_transform
- [x] rule \_readAs
- [x] .observe('/path/$params/key')
- [x] SubscriptionPayload with isUpdated isDeleted isCreated
- [x] \_getAs applied deeper, not only to the target path
- [x] .findAndUpdate .findOneAndUpdate
- [ ] rule \_writeAs
- [ ] bundle StoreLocalStorage
- [ ] bundle to npm
- [ ] Write to disk as transaction. https://github.com/npm/write-file-atomic

# Related projects

https://github.com/denyncrawford/dndb

[MaximilianHeidenreich/DsDDB](https://github.com/MaximilianHeidenreich/DsDDB)

#

Forked from [MaximilianHeidenreich/DsDDB](https://github.com/MaximilianHeidenreich/DsDDB)

```

```
