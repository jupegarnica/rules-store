import { StorePersistance } from "./StorePersistance.ts";

declare namespace sessionStorage {
  function getItem(key: string): string;
  function setItem(key: string, value: string): void;
  function clear(): void;
}

export class StoreSessionStorage extends StorePersistance {
  load(): void {
    const data = sessionStorage.getItem(this.storePath);
    if (!data) return;
    const decoded = JSON.parse((data));
    this._setData(decoded);

    return;
  }

  public write(): void {
    const data = JSON.stringify(
      this.getPrivateData({ I_PROMISE_I_WONT_MUTATE_THIS_DATA: true }),
    );
    sessionStorage.setItem(this.storePath, data);
  }
  public deleteStore(): void {
    sessionStorage.clear();
  }
}