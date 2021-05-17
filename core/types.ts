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
// deno-lint-ignore no-explicit-any
export type Mapper = (pair: KeyValue) => any;

export type Notification = {
  callback: Observer;
  id: number;
  args: ObserverArgs;
};
export type ObserverContext = {
  newData: Value;
  _newData: Value;
  oldData: Value;
  _oldData: Value;
  isUpdate: boolean;
  isCreation: boolean;
  isRemove: boolean;
  [param: string]: string | Value;
};
export type ObserverArgs = [Value, ObserverContext];
export type Observer = (...args: ObserverArgs) => void;
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
  isUpdate: boolean;
  isCreation: boolean;
  isRemove: boolean;
  [param: string]: string | ObjectOrArray | Value;
};

export type RuleArgs = [Value, RuleContext];

// deno-lint-ignore no-explicit-any
export type Rule = (...args: RuleArgs) => any;

export type Rules = {
  "_read"?: Rule;
  "_write"?: Rule;
  "_validate"?: Rule;
  "_transform"?: Rule;
  "_writeAs"?: Rule;
  "_readAs"?: Rule;
  [key: string]: Rules | Rule | undefined;
};

export type BaseConfig = {
  rules?: Rules;
  initialData?: ObjectOrArray;
  skipRules?: [
    "_read",
    "_write",
    "_readAs",
    "_writeAs",
    "_transform",
    "_validate",
  ];
};
export type ConfigPersistance = BaseConfig & {
  autoSave?: boolean;
  name?: string;
  folder?: string;
  persistLazyDelay?: number;
  serializer?: (data: ObjectOrArray) => string;
  deserializer?: (data: string) => ObjectOrArray;
};
