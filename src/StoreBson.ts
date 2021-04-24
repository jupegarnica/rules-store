import { existsSync } from "./deps.ts";

import { StoreFile } from "./StoreFile.ts";
import { Bson } from "https://deno.land/x/bson@v0.1.3/mod.ts";

/**
 * A database in RAM with persistance binary Bson.
 *
 */
export class StoreBson extends StoreFile {
  /**
   * Load stored data from disk into cache.
   *
   */
  load(): void {
    const storePath = this.storePath;
    if (!existsSync(storePath)) return;

    // Load data from file.
    const data = Deno.readFileSync(storePath);
    // Store new data.
    this.setData(Bson.deserialize(data));

    return;
  }

  /**
   * Writes cached data to disk.
   *
   */
  public write(): void {
    const data = Bson.serialize(
      this.getPrivateData({ I_PROMISE_I_WONT_MUTATE_THIS_DATA: true }),
    );

    return Deno.writeFileSync(
      this.storePath,
      data,
    );
  }
}
