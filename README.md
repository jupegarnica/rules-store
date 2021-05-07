# Rules Store

_An observable data store with persistence heavily inspired by firebase rules_

**Rules Store is about managing runtime data with security and confidence** writing rules which ensure all data is stored and read as expected. Maybe that sound familiar if you work with Databases, but it no usual talking about runtime state management.

The main motivation is to bring the databases developers' mindset to runtime state management.

## Getting Started

### CRUD operations

The main methods to read or write into the data store are `.get(path: string)`, `.set(path: string, value: any)` and `.remove(path: string)`

```ts
import { Store } from './core/Store.ts';
const store = new Store();

store.set('count', 1); // create data.count = 1
store.get('count'); // returns 1
store.set('count', 2); // update data.count = 2
store.get('elseWhere'); // returns undefined
store.remove('count'); // returns the value removed, 2
store.get('count'); // returns undefined
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

### Observe

Any path can be observed to make any logic when a certain node has changed.

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

### Persistance

The data store in the store can be persisted to Json, Yaml, LocalStorage or SessionStorage.

Just import the one that fit your needs.

```ts
// Store has not persistance adapter
import { Store } from './core/Store.ts';

// StoreJson and StoreYaml, add persistance in deno
import { StoreJson } from './core/StoreJson.ts';
import { StoreYaml } from './core/StoreYaml.ts';

// StoreLocalStorage and StoreSessionStorage, add persistance in the browser
import { StoreLocalStorage } from './core/StoreLocalStorage.ts';
import { StoreSessionStorage } from './core/StoreSessionStorage.ts';

const store = new StoreJson({ name: 'store.json' });
// will load data from './store.json' if the file exist

store.set('counter/count', 0);

store.persist();
// Synchronously updates or create a store.json file with  {"counter":{"count":0}}
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
  [$param: string]: string; // TODO
};
```

```ts
import { Store } from './core/Store.ts';
const rules = {
  counter: {
    count: {
      _read_: () => true,
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

#### Validation \_validate

#### Transformations \_transform \_writeAs \_readAs

### Reading and Updating

#### .get

#### .getRef

#### .set

#### .remove

#### .push

#### .find

#### .findOne

#### .findAndRemove

#### .findAndUpdate

#### .findOneAndUpdate

#### .findOneAndRemove

### Observability

#### .observe

#### .off

### Transactions

#### .beginTransaction

#### .commit

#### .rollback

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
