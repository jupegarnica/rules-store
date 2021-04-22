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
export type ObjectKind = { [key: string ]: any } | any[];
export type Data = { [key: string]: Value };
export type Keys = string[];
// deno-lint-ignore no-explicit-any
export type Callable = (...a: any[]) => any;

export type ValueOrFunction = Value | Callable;
export type Subscriber = (data: Value) => void;

export type KeyValue = [string, Value];
// deno-lint-ignore no-explicit-any
export type Finder = (pair: KeyValue) => any;

export type Subscription = {
  callback: Subscriber;
  value: Value;
  path: string;
};

export type Params = { [key: string]: string };
export type RuleContext = {
  data: Value;
  params: Params;
  newData: Value;
  rootData: Data;
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
  initialDataIfNoFile?: Data
};
export type Config = BaseConfig & {
  autoSave?: boolean;
  filename?: string;
  folder?: string;
  writeLazyDelay?: number;
};
