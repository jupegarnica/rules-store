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
  _read: () => true,
  $node: {
    _write: ({ data, newData }: RuleContext) =>
      data === undefined && newData !== undefined,
  },
};

export const onlyUpdate: Rules = {
  _read: () => true,
  $node: {
    _write: ({ data, newData }: RuleContext) =>
      data !== undefined && newData !== undefined,
  },
};

export const onlyRemove: Rules = {
  _read: () => true,
  $node: {
    _write: ({ newData }: RuleContext) => newData === undefined,
  },
};

export const notUpdate: Rules = {
  _read: () => true,
  $node: {
    _write: ({ data, newData }: RuleContext) =>
      data === undefined || newData === undefined,
  },
};
