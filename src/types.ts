// deno-lint-ignore no-explicit-any
export type Value = any;
// export type Value =
//   | string
//   | number
//   | null
//   | undefined
//   | symbol
//   | ObjectOrArray
//   | Value[];

// deno-lint-ignore no-explicit-any
export type ObjectOrArray = { [key: string]: any };

export type Keys = string[];

export type Callable = (...a: Value[]) => Value;
export type ValueOrFunction = Value | Callable;

export type KeyValue = [string, Value];
// deno-lint-ignore no-explicit-any
export type Finder = (pair: KeyValue) => any;

export type ObserverContext = {
  newData: Value;
  _newData: Value;
  oldData: Value;
  _oldData: Value;
  isUpdated: boolean;
  isCreated: boolean;
  isDeleted: boolean;
};
export type Observer = (data: Value, context: ObserverContext) => void;
export type Subscription = {
  callback: Observer;
  id: number;
  path: Keys;
};

export type MutationType = "set" | "remove" | "add";
export type Mutation = {
  keys: Keys;
  value: ValueOrFunction;
  oldValue?: Value;
  params?: Params;
  type: MutationType;
  index?: string;
};

export type Params = { [key: string]: string };

export type RuleFound = {
  params: Params;
  rulePath: Keys;
  [rule: string]: Value;
};
export type RuleContext = {
  oldData: Value;
  newData: Value;
  rootData: ObjectOrArray;
  _newData: Value;
  _oldData: Value;
  _rootData: ObjectOrArray;
  [param: string]: string | ObjectOrArray | Value;
};

export type RuleArgs = [Value, RuleContext];

// deno-lint-ignore no-explicit-any
export type Rule = (...args: RuleArgs) => any;

export type Rules = {
  ".read"?: Rule;
  ".write"?: Rule;
  ".validate"?: Rule;
  ".transform"?: Rule;
  ".as"?: Rule;
  [key: string]: Rules | Rule | undefined;
};

export type BaseConfig = {
  rules?: Rules;
  initialData?: ObjectOrArray;
};
export type Config = BaseConfig & {
  autoSave?: boolean;
  name?: string;
  folder?: string;
  writeLazyDelay?: number;
};
