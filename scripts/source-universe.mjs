import { createHash } from "node:crypto"

/** Stable across record order and unrelated editorial metadata changes. */
export function sourceUniverseDigest(records) {
  if (!Array.isArray(records)) throw new Error("Expected source records array")
  const urls = records.map((item) => {
    if (typeof item?.url !== "string" || !/^https?:\/\//.test(item.url)) {
      throw new Error("Source URL must be HTTP(S)")
    }
    return item.url
  })
  if (new Set(urls).size !== urls.length) throw new Error("Duplicate URLs in source universe")
  return createHash("sha256").update(JSON.stringify(urls.sort())).digest("hex")
}
