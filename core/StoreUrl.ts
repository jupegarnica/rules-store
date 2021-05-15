import { StorePersistance } from "./StorePersistance.ts";

declare namespace window.history {
  function replaceState(a: { path: string }, b: string, c: string): void;
}

export class StoreUrl extends StorePersistance {
  load(): void {
    const searchParams = new URLSearchParams(location.search);
    const text = searchParams.get(this.storePath);
    if (!text) return;
    const data = JSON.parse(text);
    this._setData(data);
  }

  public persist(): void {
    const data = JSON.stringify(
      this.getPrivateData({ I_PROMISE_I_WONT_MUTATE_THIS_DATA: true }),
    );
    const searchParams = new URLSearchParams(location.search);
    searchParams.set(this.storePath, data);

    if (window.history?.replaceState) {
      const url = location.protocol +
        "//" + location.host +
        location.pathname +
        "?" +
        searchParams.toString();

      window.history?.replaceState(
        {
          path: url,
        },
        "",
        url,
      );
    }
  }
  public deletePersisted(): void {
    const searchParams = new URLSearchParams(location.search);
    searchParams.delete(this.storePath);
    if (window.history?.replaceState) {
      const url = location.protocol +
        "//" + location.host +
        location.pathname +
        "?" +
        searchParams.toString();

      window.history?.replaceState(
        {
          path: url,
        },
        "",
        url,
      );
    }
  }
}
