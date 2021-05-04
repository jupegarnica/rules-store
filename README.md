# Rules Store

_An observable data store heavily inspired from firebase rules_

Rules Store is not about an observable data store with persistence to localStorage, json or yaml.

**Rules Store is about managing runtime state data with security and confidence** writing a rules object which ensure all data is stored as expected. Maybe that sound familiar if you work with Databases, but it no usual talking about runtime state management in frontend or backend.

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
        _transform: (password: string) => encrypt(password),
        _readAs: () => '********',
      },
    },
  },
};
const authStore = new Store({
  initialData,
  autoSave: true,
  rules,
});
const uuid = v4.generate();

assertThrows(
  () => {
    authStore.set('users/' + uuid, {
      email: '@notValidEmail',
      password: '1234',
    });
  },
  ValidationError,
  `Validation fails at path /users/${uuid}/email`,
);

authStore.set('users/' + uuid, {
  email: 'juan@geekshubs.com',
  password: '1234',
});

assertEquals(authStore.get('users/' + uuid), {
  email: 'juan@geekshubs.com',
  password: '********',
});
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
