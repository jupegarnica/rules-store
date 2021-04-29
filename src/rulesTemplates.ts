import type { RuleContext, Rules } from "./types.ts";

export const allowAll: Rules = {
  _read: () => true,
  _write: () => true,
};

export const denyAll: Rules = {
  _read: () => false,
  _write: () => false,
};

export const onlyCreate: Rules = {
  _write: ({ data, newData }: RuleContext) =>
    data === undefined && newData !== undefined,
};

export const onlyUpdate: Rules = {
  _write: ({ data, newData }: RuleContext) =>
    data !== undefined && newData !== undefined,
};

export const onlyRemove: Rules = {
  _write: ({ newData }: RuleContext) => newData === undefined,
};

export const noUpdate: Rules = {
  _write: ({ data, newData }: RuleContext) =>
    data === undefined || newData === undefined,
};

export const noDelete: Rules = {
  _write: ({ newData }: RuleContext) => newData !== undefined,
};

export const noCreate: Rules = {
  _write: ({ data }: RuleContext) => data !== undefined,
};

export const withTimestamps = {
  _transform: ({ newData, data }: RuleContext) => {
    const now = new Date().toISOString();
    if (data === undefined) {
      // add createAt and updateAt
      return newData &&
        ({ ...newData, createAt: now, updateAt: now });
    } else {
      // ensure createAt is not edited
      return newData &&
        ({ ...newData, createAt: data.createAt, updateAt: now });
    }
  },
};

export const asDate = {
  _write: () =>
    ({ newData }: RuleContext) =>
      newData instanceof Date || typeof newData === "string",
  _transform: ({ newData }: RuleContext) => new Date(newData).toISOString(),
  // _validate: ({ newData }: RuleContext) =>
  //   new Date(newData).toString() !== "Invalid Date",
  _as: ({ data }: RuleContext) => new Date(data),
};
