import { existsSync } from "./deps.ts";
import {
  parse,
  stringify,
} from "https://deno.land/std@0.92.0/encoding/yaml.ts";

import type { Value } from "./types.ts";
import { StoreFile } from "./StoreFile.ts";
/**
 * A database in RAM with persistance plain text as JSON.
 * For non persistance use Store
 */
export class StoreYaml extends StoreFile {

  /**
   * Load stored data from disk into cache.
   * Won't update cache values if hash in store file matches current cache file.
   *
   * @param storePath Custom file path used by read operation
   * @param force Ignore hash comparison and force read
   */
   public load(): void {
    const storePath = this._storePath;
    if (!existsSync(storePath)) return;

    // Load data from file.
    const data = Deno.readFileSync(storePath);
    const decoder = new TextDecoder("utf-8");
    const decoded: Value = parse(decoder.decode(data));

    this._data = decoded;

    return;
  }

  /**
   * Writes cached data to disk.
   * Won't perform write if the last known hash from the store file
   * matches the current cache hash.
   *
   * @param storePath Custom file path used by write operation
   * @param force Ignore hashe comparison and force write
   */
  public write(): void {

    const data = stringify( this._data);
    const encoder = new TextEncoder();
    return Deno.writeFileSync(this.storePath, encoder.encode(data));
  }

}
