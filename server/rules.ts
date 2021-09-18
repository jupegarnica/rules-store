import type { RuleContext } from '../core/mod.ts';
const rules = {
  onlyRead: {
    _read: () => true,
    _write: () => false,
  },
  onlyWrite: {
    _read: () => false,
    _write: () => true,
  },
  validation: {
    _validate(data: number, { isRemove }: RuleContext) {
      return isRemove || data === 1;
    },
    _read: () => true,
    _write: () => true,
  },
  $any: {
    _read: () => true,
    _write: () => true,
  },
};

export default rules;
