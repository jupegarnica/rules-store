import { StorePersistance } from "./StorePersistance.ts";

declare namespace localStorage {
  function getItem(key: string): string;
  function setItem(key: string, value: string): void;
  function clear(): void;
}

export class StoreLocalStorage extends StorePersistance {
  load(): void {
    const data = localStorage.getItem(this.storePath);
    if (!data) return;
    const decoded = JSON.parse((data));
    this._setData(decoded);

    return;
  }

  public persist(): void {
    const data = JSON.stringify(
      this.getPrivateData({ I_PROMISE_I_WONT_MUTATE_THIS_DATA: true }),
    );
    localStorage.setItem(this.storePath, data);
  }
  public deletePersisted(): void {
    localStorage.clear();
  }
}
