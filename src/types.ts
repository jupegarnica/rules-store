export type Subscriber = (data: unknown) => void;
export type Subscription = {
  callback: Subscriber;
  hash: string;
  path: string;
};

// deno-lint-ignore no-explicit-any
export type Value = any;
export type Data = { [key: string]: Value };

export type ValueOrFunction = Value | ((value: Value) => Value);

export type StoreConfig = {
    autoSave?: boolean;
}

export type JsonConfig = StoreConfig & {
  filename?: string;
  folder?: string;

}

export type YamlConfig = JsonConfig