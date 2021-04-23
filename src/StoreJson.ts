import { existsSync } from "./deps.ts";

import { StoreFile } from "./StoreFile.ts";
/**
 * A database in RAM with persistance plain text as JSON.
 *
 */
export class StoreJson extends StoreFile {
  /**
   * Load stored data from disk into cache.
   *
   */
  load(): void {
    const storePath = this.storePath;
    if (!existsSync(storePath)) return;

    const data = Deno.readFileSync(storePath);
    const decoder = new TextDecoder("utf-8");
    const decoded = JSON.parse(decoder.decode(data));

    this.setData(decoded);

    return;
  }

  /**
   * Writes cached data to disk.
   *
   */
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
}
