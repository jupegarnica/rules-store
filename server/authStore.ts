import { StoreYaml } from "../core/StoreYaml.ts";
import * as bcrypt from "https://deno.land/x/bcrypt@v0.2.4/mod.ts";
import { isEmail } from "https://deno.land/x/isemail/mod.ts";
import type { RuleContext, Value } from "../core/types.ts";
import { ValidationError } from "../core/Errors.ts";

const encrypt = bcrypt.hashSync;
const initialData = {
  users: {},
  emails: {},
};
const rules = {
  emails: {
    _write: () => true,
    _read: () => false,
  },
  users: {
    _write: () => true,
    _read: () => true,
    $uuid: {
      _validate: (user: Value, { $uuid, _rootData }: RuleContext) => {
        if (($uuid in _rootData.users)) {
          throw new ValidationError("user already exist");
        }
        if (!(user.name && user.email && user.password)) {
          throw new ValidationError("required field missing");
        }
        return true;
      },
      _readAs: (user: Value, { $uuid }: RuleContext) => ({
        ...user,
        uuid: $uuid,
      }),
      name: {
        _validate: (name: string) =>
          typeof name === "string" && name.length >= 3,
      },
      email: {
        _validate: (email: string, { rootData }: RuleContext) => {
          if (!isEmail(email)) {
            throw new ValidationError("not a valid email");
          }
          if ((email in rootData.emails)) {
            throw new ValidationError("email in use");
          }
          return true;
        },
      },
      role: {
        _validate: (role: string, { rootData }: RuleContext) =>
          role in rootData.roles,
      },
      password: {
        _transform: (plainPass: string) => encrypt(plainPass),
        //   _readAs: () => "********",
      },
    },
  },
};
const authStore = new StoreYaml({
  name: "auth.yaml",
  initialData,
  autoSave: true,
  rules,
});

authStore.observe(
  "users/$uuid/email",
  (email, { isCreation, isUpdate, isRemove, oldData, $uuid }) => {
    if (isCreation) {
      authStore.set("emails/" + email, $uuid);
    }
    if (isRemove) {
      authStore.remove("emails/" + oldData);
    }
    if (isUpdate) {
      authStore.remove("emails/" + oldData);
      authStore.set("emails/" + email, $uuid);
    }
  },
);

export { authStore };
