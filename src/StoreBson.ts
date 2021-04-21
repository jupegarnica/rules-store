import { existsSync } from "./deps.ts";

import { StoreFile } from "./StoreFile.ts";
import { Bson } from "https://deno.land/x/bson@v0.1.3/mod.ts";

/**
 * A database in RAM with persistance plain text as JSON.
 * For non persistance use Store
 */
export class StoreBson extends StoreFile {
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
    // const decoder = new TextDecoder("utf-8");
    // const decoded = JSON.parse(decoder.decode(data));

    // Store new data.
    this._data = Bson.deserialize(data);

    return;
  }

  /**
   * Writes cached data to disk.
   * Won't perform write if the last known hash from the store file
   * matches the current cache hash.
   *
   */
  public write(): void {
    // const data = JSON.stringify(this._data);
    // const encoder = new TextEncoder();
    const data = Bson.serialize(this._data);
    return Deno.writeFileSync(
      this._storePath,
      data,
    );
  }
}