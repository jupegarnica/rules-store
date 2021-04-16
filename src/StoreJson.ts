import { existsSync } from './deps.ts';

import { StoreFile } from './StoreFile.ts';
import { Config } from './types.ts';
/**
 * A database in RAM with persistance plain text as JSON.
 * For non persistance use Store
 */
export class StoreJson extends StoreFile {



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
    const decoder = new TextDecoder('utf-8');
    const decoded = JSON.parse(decoder.decode(data));

    // Reload probably not necessary.
    if (decoded._hash === this._dataHash) return;

    // Store new data.
    this._data = decoded.data;
    this._lastKnownStoreHash = decoded._hash;

    return;
  }

  /**
   * Writes cached data to disk.
   * Won't perform write if the last known hash from the store file
   * matches the current cache hash.
   *
   */
  public write(): void {
    // Write probably not necessary.
    if (this._lastKnownStoreHash === this._dataHash) {
      return;
    }

    // Write data.
    const data = JSON.stringify({
      _hash: this._dataHash,
      data: this._data,
    });
    const encoder = new TextEncoder();
    return Deno.writeFileSync(
      this._storePath,
      encoder.encode(data),
    );
  }

}
