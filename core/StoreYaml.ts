import { StoreNotFoundError } from "./Errors.ts";
import { dirname, existsSync, fromFileUrl, resolve } from "./deps.ts";

import {
  parse,
  stringify,
} from "https://deno.land/std@0.92.0/encoding/yaml.ts";

import type { Value } from "./types.ts";
import { StorePersistance } from "./StorePersistance.ts";

export class StoreYaml extends StorePersistance {
  public load(): void {
    const filename = this._name;
    const folder = resolve(fromFileUrl(dirname(Deno.mainModule)), this._folder);
    const storePath = resolve(folder, filename);
    this._storePath = storePath;
    if (!existsSync(storePath)) return;

    const data = Deno.readFileSync(storePath);
    const decoder = new TextDecoder("utf-8");
    const decoded: Value = parse(decoder.decode(data));

    this._setData(decoded);

    return;
  }

  public persist(): void {
    const data = this.getPrivateData({
      I_PROMISE_I_WONT_MUTATE_THIS_DATA: true,
    });
    const txt = stringify(data);
    const encoder = new TextEncoder();
    return Deno.writeFileSync(this.storePath, encoder.encode(txt));
  }
  public deletePersisted(): void {
    const storePath = this.storePath;
    if (!existsSync(storePath)) {
      throw new StoreNotFoundError(`${storePath} not exists`);
    }
    Deno.removeSync(storePath);
    return;
  }
}
