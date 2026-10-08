// Validates data/seen.json (or the file given as argv[2]) against
// data/seen.schema.json plus checks JSON Schema cannot express.
//   npm run validate                 # data/seen.json
//   node scripts/validate.mjs path/to/other.json
// Exit code 1 on any error. Warnings (e.g. past deadlines) never fail the run.
import { readFileSync } from "node:fs"
import { createHash } from "node:crypto"
import { dirname, resolve, relative } from "node:path"
import { fileURLToPath } from "node:url"
import Ajv2020 from "ajv/dist/2020.js"
import addFormats from "ajv-formats"

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..")
const file = resolve(process.argv[2] || resolve(root, "data/seen.json"))
const schema = JSON.parse(readFileSync(resolve(root, "data/seen.schema.json"), "utf8"))
const errors = []
const warnings = []
const where = (i, it) => `#${i}${it && typeof it === "object" && it.title ? ` "${String(it.title).slice(0, 60)}"` : ""}`

let data
try {
  data = JSON.parse(readFileSync(file, "utf8"))
} catch (e) {
  console.error(`✗ ${file}: not valid JSON: ${e.message}`)
  process.exit(1)
}

const ajv = new Ajv2020({ allErrors: true, strict: true, allowUnionTypes: true })
addFormats(ajv)
const validate = ajv.compile(schema)
if (!validate(data)) {
  for (const e of validate.errors) {
    const m = e.instancePath.match(/^\/(\d+)(.*)$/)
    const loc = m ? `${where(+m[1], data[+m[1]])} ${m[2] || "(item)"}` : e.instancePath || "(root)"
    const extra = e.keyword === "additionalProperties" ? `: "${e.params.additionalProperty}" (add it to SCHEMA.md + seen.schema.json first)`
      : e.keyword === "enum" ? `: ${JSON.stringify(e.params.allowedValues)}` : ""
    // anyOf branches repeat the same problem; keep the message short.
    if (e.keyword === "anyOf") continue
    errors.push(`${loc}: ${e.message}${extra}`)
  }
}

if (Array.isArray(data)) {
  const ids = new Map()
  const urls = new Map()
  const now = Date.now()
  data.forEach((it, i) => {
    if (!it || typeof it !== "object") return
    const url = typeof it.url === "string" ? it.url : ""
    // URL must parse and be http(s) with a real host.
    try {
      const u = new URL(url)
      if (!/^https?:$/.test(u.protocol) || !u.hostname.includes(".")) throw new Error("not an http(s) URL with a host")
    } catch (e) {
      errors.push(`${where(i, it)} url: invalid URL ${JSON.stringify(url)} (${e.message})`)
    }
    // ids: explicit id or sha1(url)[:12], exactly what the dashboard uses.
    const id = it.id || createHash("sha1").update(url || it.title || "").digest("hex").slice(0, 12)
    if (ids.has(id)) errors.push(`${where(i, it)}: duplicate id ${id} (same as ${where(ids.get(id), data[ids.get(id)])})`)
    else ids.set(id, i)
    // Same page modulo scheme/www/trailing slash/case (anchors and queries count as different).
    const norm = url.replace(/^https?:\/\/(www\.)?/i, "").replace(/\/+(?=$|[?#])/, "").toLowerCase()
    if (norm && urls.has(norm) && ids.get(id) === i) warnings.push(`${where(i, it)}: URL looks like a duplicate of ${where(urls.get(norm), data[urls.get(norm)])}`)
    else if (norm) urls.set(norm, i)
    // Value consistency.
    if (typeof it.value_usd_min === "number" && typeof it.value_usd_estimate === "number" && it.value_usd_min > it.value_usd_estimate)
      errors.push(`${where(i, it)}: value_usd_min (${it.value_usd_min}) > value_usd_estimate (${it.value_usd_estimate})`)
    if (typeof it.value_usd_estimate === "number" && (!it.value_text || it.value_text === "không rõ"))
      warnings.push(`${where(i, it)}: value_usd_estimate set but value_text is "${it.value_text ?? ""}"`)
    // Deadline consistency.
    if (it.deadline_type === "fixed" && it.deadline_iso === null) errors.push(`${where(i, it)}: deadline_type "fixed" but deadline_iso is null`)
    if ((it.deadline_type === "rolling" || it.deadline_type === "opens_later") && it.deadline_iso)
      warnings.push(`${where(i, it)}: deadline_type "${it.deadline_type}" but deadline_iso is set`)
    if (typeof it.deadline_iso === "string") {
      const t = Date.parse(it.deadline_iso)
      if (Number.isNaN(t)) errors.push(`${where(i, it)}: deadline_iso not parseable`)
      else if (t < now) warnings.push(`${where(i, it)}: deadline ${it.deadline_iso} has passed (fine to keep; the dashboard shows it under "Đã hết hạn")`)
    }
  })
}

const rel = relative(process.cwd(), file) || file
for (const w of warnings) console.warn(`! ${w}`)
if (errors.length) {
  for (const e of errors) console.error(`✗ ${e}`)
  console.error(`\n✗ ${rel}: ${errors.length} error(s), ${warnings.length} warning(s)`)
  process.exit(1)
}
console.log(`✓ ${rel}: ${Array.isArray(data) ? data.length : 0} items valid (${warnings.length} warning(s))`)
