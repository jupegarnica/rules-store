export type Subscriber = (data: unknown) => void;
export type Subscription = {
  callback: Subscriber;
  hash: string;
  path: string;
};

// deno-lint-ignore no-explicit-any
export type Value = any;
export type Data = { [key: string]: Value };
