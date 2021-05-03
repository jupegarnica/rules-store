import { existsSync } from "./deps.ts";
import { StoreNotFoundError } from "./Errors.ts";

import { StorePersistance } from "./StorePersistance.ts";
import { Bson } from "https://deno.land/x/bson@v0.1.3/mod.ts";

export class StoreBson extends StorePersistance {
  load(): void {
    const storePath = this.storePath;
    if (!existsSync(storePath)) return;

    // Load data from file.
    const data = Deno.readFileSync(storePath);
    // Store new data.
    this._setData(Bson.deserialize(data));

    return;
  }

  public write(): void {
    const data = Bson.serialize(
      this.getPrivateData({ I_PROMISE_I_WONT_MUTATE_THIS_DATA: true }),
    );

    return Deno.writeFileSync(
      this.storePath,
      data,
    );
  }
  public deleteStore(): void {
    const storePath = this.storePath;
    if (!existsSync(storePath)) {
      throw new StoreNotFoundError(`${storePath} not exists`);
    }
    Deno.removeSync(storePath);
    return;
  }
}
