import { StorePersistance } from "./StorePersistance.ts";

declare namespace window.history {
  function replaceState(a: { path: string }, b: string, c: string): void;
}

export class StoreUrl extends StorePersistance {
  public load(): void {
    if (!window.history?.replaceState) {
      throw new Error("not window.history?.replaceState");
    }
    const searchParams = new URLSearchParams(location.search);
    const text = searchParams.get(this.storePath);
    if (!text) return;
    const data = this.parse(text);
    this._setData(data);
  }

  public persist(): void {
    const data = this.stringify(
      this.getPrivateData({ I_PROMISE_I_WONT_MUTATE_THIS_DATA: true }),
    );
    const searchParams = new URLSearchParams(location.search);
    searchParams.set(this.storePath, data);
    const { protocol, host, pathname } = location;
    const path = `${protocol}//${host}${pathname}?${searchParams.toString()}`;

    window.history?.replaceState(
      { path },
      "",
      path,
    );
  }
  public deletePersisted(): void {
    const searchParams = new URLSearchParams(location.search);
    searchParams.delete(this.storePath);
    const { protocol, host, pathname } = location;
    const path = `${protocol}//${host}${pathname}?${searchParams.toString()}`;
    window.history?.replaceState(
      { path },
      "",
      path,
    );
  }
}
