import { StoreNotFoundError } from "./Errors.ts";
import { dirname, existsSync, fromFileUrl, resolve } from "./deps.ts";
import { StorePersistance } from "./StorePersistance.ts";
import { Bson } from "https://deno.land/x/bson@v0.1.3/mod.ts";

export class StoreBson extends StorePersistance {
  public load(): void {
    const filename = this._name;
    const folder = resolve(fromFileUrl(dirname(Deno.mainModule)), this._folder);
    const storePath = resolve(folder, filename);
    this._storePath = storePath;
    if (!existsSync(storePath)) return;

    // Load data from file.
    const data = Deno.readFileSync(storePath);
    // Store new data.
    this._setData(Bson.deserialize(data));

    return;
  }

  public persist(): void {
    const data = Bson.serialize(
      this.getPrivateData({ I_PROMISE_I_WONT_MUTATE_THIS_DATA: true }),
    );

    return Deno.writeFileSync(
      this.storePath,
      data,
    );
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
