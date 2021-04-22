import { existsSync } from "./deps.ts";
import {
  parse,
  stringify,
} from "https://deno.land/std@0.92.0/encoding/yaml.ts";

import type { Value } from "./types.ts";
import { StoreFile } from "./StoreFile.ts";
/**
 * A database in RAM with persistance plain text as Yaml.
 */
export class StoreYaml extends StoreFile {
  /**
   * Load stored data from disk into cache.
   *
   */
  public load(): void {
    const storePath = this.storePath;
    if (!existsSync(storePath)) return;

    const data = Deno.readFileSync(storePath);
    const decoder = new TextDecoder("utf-8");
    const decoded: Value = parse(decoder.decode(data));

    this.setData(decoded);

    return;
  }

  /**
   * Writes cached data to disk.
   *
   */
  public write(): void {
    const data = stringify(this._data);
    const encoder = new TextEncoder();
    return Deno.writeFileSync(this.storePath, encoder.encode(data));
  }
}
