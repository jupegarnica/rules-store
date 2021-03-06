import { StoreNotFoundError } from "./Errors.ts";
import { dirname, existsSync, fromFileUrl, resolve } from "./deps.ts";
import { StorePersistance } from "./StorePersistance.ts";

export class StoreJson extends StorePersistance {
  public load(): void {
    const filename = this._name;
    const folder = resolve(fromFileUrl(dirname(Deno.mainModule)), this._folder);
    const storePath = resolve(folder, filename);
    this._storePath = storePath;
    if (!existsSync(storePath)) return;

    const data = Deno.readFileSync(storePath);
    const decoder = new TextDecoder("utf-8");
    const decoded = this.parse(decoder.decode(data));

    this._setData(decoded);

    return;
  }

  public persist(): void {
    const data = this.stringify(
      this.getPrivateData({ I_PROMISE_I_WONT_MUTATE_THIS_DATA: true }),
    );
    const encoder = new TextEncoder();
    return Deno.writeFileSync(
      this.storePath,
      encoder.encode(data),
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
