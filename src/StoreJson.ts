import { StoreNotFoundError } from "./Errors.ts";
import { dirname, existsSync, fromFileUrl, resolve } from "./deps.ts";
import { StorePersistance } from "./StorePersistance.ts";

export class StoreJson extends StorePersistance {
  load(): void {
    const storePath = this.storePath;
    if (!existsSync(storePath)) return;

    const data = Deno.readFileSync(storePath);
    const decoder = new TextDecoder("utf-8");
    const decoded = JSON.parse(decoder.decode(data));

    this._setData(decoded);

    return;
  }
  public get storePath(): string {
    const filename = this._name;
    const folder = this._folder || fromFileUrl(dirname(Deno.mainModule));
    return resolve(folder, filename);
  }

  public write(): void {
    const data = JSON.stringify(
      this.getPrivateData({ I_PROMISE_I_WONT_MUTATE_THIS_DATA: true }),
    );
    const encoder = new TextEncoder();
    return Deno.writeFileSync(
      this.storePath,
      encoder.encode(data),
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
