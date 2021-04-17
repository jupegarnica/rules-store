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

export type Data = { [key: string]: Value };

export type ValueOrFunction = Value | ((value: Value) => Value);
export type Subscriber = (data: Value) => void;
// deno-lint-ignore no-explicit-any
export type Finder = (value: Value, key: string) => any;

export type Subscription = {
  callback: Subscriber;
  value: Value;
  path: string;
};

export type Params = { [key: string]: string };
export type RuleContext = {
  data: Value;
  params: Params;
};

// deno-lint-ignore no-explicit-any
export type Rule = (context: RuleContext) => any;

export type Rules = {
  '.read'?: Rule;
  '.write'?: Rule;
  '.validate'?: Rule;
  '.transform'?: Rule;
  [key: string]: Rules | Rule | undefined;
};

export type BaseConfig = {
  rules?: Rules;
};
export type Config = BaseConfig & {
  autoSave?: boolean;
  filename?: string;
  folder?: string;
};
