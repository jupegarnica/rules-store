# Rules Data Store

_An observable data store heavily inspired from firebase rules_

Rules DS is not about an observable data store with persistence to localStorage, json or yaml.

**Rules DS is about managing runtime state data with security and confidence** writing a rules object which ensure all data is stored as expected. Maybe that sound familiar if you work with Databases, but it no usual talking about runtime state management in frontend or backend.

## Intro

```ts
const authStore = new Store({
  initialData: {
    users: {},
    roles: {
      admin: 1,
      client: 2,
    },
  },

  rules: {
    roles: {
      _write: () => false,
      _read: () => false,
    },
    users: {
      _write: () => true,
      _read: () => true,
      $uuid: {
        name: {
          _validate: (name) =>
            typeof name === 'string' && name.length >= 3,
        },
        email: {
          _validate: (name) => isEmail(name),
        },
        role: {
          _validate: (role, { rootData }) =>
            role in _rootData.roles,
        },
        password: {
          _transform: (plainPass) => encrypt(plainPass),
          _as: (encryptedPass) => decrypt(encryptedPass),
        },
      },
    },
  },
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
- [x] rule \_as
- [x] .observe('/path/$params/key')
- [x] SubscriptionPayload with isUpdated isDeleted isCreated
- [x] \_getAs applied deeper, not only to the target path
- [x] .findAndUpdate .findOneAndUpdate
- [ ] bundle StoreLocalStorage
- [ ] bundle to npm
- [ ] Write to disk as transaction. https://github.com/npm/write-file-atomic

# Related projects

https://github.com/denyncrawford/dndb

[MaximilianHeidenreich/DsDDB](https://github.com/MaximilianHeidenreich/DsDDB)

#

Forked from [MaximilianHeidenreich/DsDDB](https://github.com/MaximilianHeidenreich/DsDDB)
