// deno-lint-ignore no-explicit-any
export type Value = any;
// TODO
// export type Value =
//   | string
//   | number
//   | null
//   | undefined
//   | { [key: string]: Value }
//   | Value[];

// deno-lint-ignore no-explicit-any
export type ObjectOrArray = { [key: string]: any };

export type Keys = string[];

export type Callable = (...a: Value[]) => Value;
export type ValueOrFunction = Value | Callable;

export type KeyValue = [string, Value];
// deno-lint-ignore no-explicit-any
export type Finder = (pair: KeyValue) => any;

export type SubscriberPayload = { newData: Value; oldData: Value };
export type Subscriber = (data: SubscriberPayload) => void;
export type Subscription = {
  callback: Subscriber;
  id: number;
  path: string;
};

export type Transformation = {
  keys: Keys;
  value: ValueOrFunction;
  transformContext?: RuleContext;
};

export type Params = { [key: string]: string };

// export type RuleFound = {
//   params: Params;
//   rulePath: Keys;
//   [rule: string]: Params | Keys | Rule | undefined;
// };

export type RuleFound = {
  params: Params;
  rulePath: Keys;
  [rule: string]: Value;
};
export type RuleContext = {
  data: Value;
  newData: Value;
  rootData: ObjectOrArray;
  _data: Value;
  _newData: Value;
  _rootData: ObjectOrArray;
  [param: string]: string | ObjectOrArray;
};

// deno-lint-ignore no-explicit-any
export type Rule = (context: RuleContext) => any;

export type Rules = {
  ".read"?: Rule;
  ".write"?: Rule;
  ".validate"?: Rule;
  ".transform"?: Rule;
  [key: string]: Rules | Rule | undefined;
};

export type BaseConfig = {
  rules?: Rules;
  initialData?: ObjectOrArray;
};
export type Config = BaseConfig & {
  autoSave?: boolean;
  filename?: string;
  folder?: string;
  writeLazyDelay?: number;
};
