import type { RuleContext, Rules, Value } from "./types.ts";

export const allowAll: Rules = {
  _read: () => true,
  _write: () => true,
};

export const denyAll: Rules = {
  _read: () => false,
  _write: () => false,
};

export const onlyCreate: Rules = {
  _write: (newData: Value, { oldData }: RuleContext) =>
    oldData === undefined && newData !== undefined,
};

export const onlyUpdate: Rules = {
  _write: (newData: Value, { oldData }: RuleContext) =>
    oldData !== undefined && newData !== undefined,
};

export const onlyRemove: Rules = {
  _write: (newData: Value) => newData === undefined,
};

export const noUpdate: Rules = {
  _write: (newData: Value, { oldData }: RuleContext) =>
    oldData === undefined || newData === undefined,
};

export const noDelete: Rules = {
  _write: (newData: Value) => newData !== undefined,
};

export const noCreate: Rules = {
  _write: (_: Value, { oldData }) => oldData !== undefined,
};

export const withTimestamps = {
  _transform: (_: Value, { newData, oldData }: RuleContext) => {
    const now = new Date().toISOString();
    if (oldData === undefined) {
      // add createAt and updateAt
      return newData &&
        ({ ...newData, createAt: now, updateAt: now });
    } else {
      // ensure createAt is not edited
      return newData &&
        ({ ...newData, createAt: oldData.createAt, updateAt: now });
    }
  },
};

export const asDate = {
  _write: () =>
    (newData: Value) => newData instanceof Date || typeof newData === "string",
  _transform: (newData: Value) => new Date(newData).toISOString(),
  // _validate: (newData:Value) =>
  //   new Date(newData).toString() !== "Invalid Date",
  _as: (data: Value) => new Date(data),
};
