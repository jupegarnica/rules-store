import { existsSync } from "./deps.ts";

import { StoreFile } from "./StoreFile.ts";
import { Bson } from "https://deno.land/x/bson@v0.1.3/mod.ts";
import type { Config } from "./types.ts";

/**
 * A database in RAM with persistance plain text as JSON.
 * For non persistance use Store
 */
export class StoreBson extends StoreFile {
  constructor(config?: Config) {
    super(config);
  }
  /**
   * Load stored data from disk into cache.
   * Won't update cache values if hash in store file matches current cache file.
   *
   */
  load(): void {
    const storePath = this._storePath;
    if (!existsSync(storePath)) return;

    // Load data from file.
    const data = Deno.readFileSync(storePath);
    // Store new data.
    this.setData(Bson.deserialize(data));

    return;
  }

  /**
   * Writes cached data to disk.
   * Won't perform write if the last known hash from the store file
   * matches the current cache hash.
   *
   */
  public write(): void {
    const data = Bson.serialize(this._data);
    return Deno.writeFileSync(
      this._storePath,
      data,
    );
  }
}
