import { isIP } from "node:net"

/** Normalize URLs only for deduplication; never change the stored official URL/id. */
export function canonicalUrl(value) {
  try {
    const url = new URL(value)
    url.hash = ""
    url.hostname = url.hostname.toLowerCase().replace(/^www\./, "")
    url.pathname = url.pathname.replace(/\/+$/, "") || "/"
    for (const key of [...url.searchParams.keys()]) {
      if (/^(utm_|fbclid$|gclid$|mc_)/i.test(key)) url.searchParams.delete(key)
    }
    return url.hostname + url.pathname + (url.search ? url.search : "")
  } catch { return "" }
}

export function isPrivateIp(address) {
  if (!isIP(address)) return false
  if (isIP(address) === 6) {
    const s = address.toLowerCase()
    return s === "::" || s === "::1" || s.startsWith("fe80:") ||
      /^f[cd][0-9a-f]{2}:/.test(s) || s.startsWith("::ffff:") ||
      s.startsWith("2001:db8:")
  }
  const a = address.split(".").map(Number)
  return a[0] === 0 || a[0] === 10 || a[0] === 127 || a[0] >= 224 ||
    (a[0] === 100 && a[1] >= 64 && a[1] <= 127) ||
    (a[0] === 169 && a[1] === 254) ||
    (a[0] === 172 && a[1] >= 16 && a[1] <= 31) ||
    (a[0] === 192 && (a[1] === 168 || a[1] === 0)) ||
    (a[0] === 198 && a[1] >= 18 && a[1] <= 19)
}

/** Reject local hosts, unusual schemes and embedded credentials. */
export function validatePublicUrl(input) {
  let url
  try { url = new URL(input) }
  catch { return { safe: false, reason: "Malformed URL" } }
  if (!["https:", "http:"].includes(url.protocol)) return { safe: false, reason: "Unsupported protocol" }
  if (url.username || url.password) return { safe: false, reason: "Embedded credentials" }
  const host = url.hostname.toLowerCase().replace(/\.$/, "")
  if (!host.includes(".") || isIP(host) || host === "localhost" ||
    /\.(localhost|local|internal|test|invalid|example)$/.test(host)) {
    return { safe: false, reason: "Local or reserved hostname" }
  }
  if (url.port && !["80", "443"].includes(url.port)) return { safe: false, reason: "Unexpected port" }
  return { safe: true, url }
}

export function httpHealth(status) {
  if (status >= 200 && status < 300) return "reachable"
  if ([401,403,429].includes(status)) return "restricted"
  if ([404,410].includes(status)) return "missing"
  if (status >= 500) return "server_error"
  return "uncertain"
}

export async function mapLimit(items, concurrency, task) {
  const results = new Array(items.length)
  let cursor = 0
  await Promise.all(Array.from({ length: Math.min(items.length, Math.max(1, concurrency)) }, async () => {
    while (cursor < items.length) {
      const index = cursor++
      results[index] = await task(items[index], index)
    }
  }))
  return results
}
