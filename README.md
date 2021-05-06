# Rules Store

_An observable data store with persistence heavily inspired by firebase rules_

**Rules Store is about managing runtime data with security and confidence** writing rules which ensure all data is stored and read as expected. Maybe that sound familiar if you work with Databases, but it no usual talking about state management in frontend.

The main motivation is to bring the databases developers' mindset to runtime state management.

## Getting Started

### CRUD operation

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
store.get('counter'); // throws PermissionError, 'Not explicit permission to read'
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

### Persistance

### Observe

## Example

```ts
const initialData = {
  users: {},
};

const rules = {
  users: {
    $uuid: {
      _write: () => true,
      _read: () => true,
      email: {
        _validate: (email: string) => isEmail(email),
      },
      password: {
        _validate: (password: string) => password.length >= 8,
        _writeAs: (password: string) => encrypt(password),
        _readAs: () => '********',
      },
    },
  },
};
const authStore = new StoreYaml({
  rules,
  initialData,
  autoSave: true,
});

const uuid = v4.generate();
authStore.set(`users/${uuid}`, {
  email: 'juan@geekshubs.com',
  password: '12345678',
});

assertEquals(authStore.get(`users/${uuid}`), {
  email: 'juan@geekshubs.com',
  password: '********',
});

try {
  authStore.set('users/' + uuid, {
    email: '@notValidEmail',
    password: '12345678',
  });
} catch (error) {
  assertEquals(error instanceof ValidationError, true);
  assertEquals(
    error.message,
    `Validation fails at path /users/${uuid}/email`,
  );
}
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
