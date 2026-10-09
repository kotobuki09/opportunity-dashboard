/**
 * Daily public deployment health check. Only tests public static files on the
 * deployment origin; no accounts, credentials or browser-local notes are read.
 */
import { appendFileSync } from "node:fs"
import { resolve } from "node:path"
import { pathToFileURL } from "node:url"

export const LIVE = "https://kotobuki09.github.io/opportunity-dashboard/"

export function extractAssets(html, base = LIVE) {
  if (typeof html !== "string" || html.length > 2_000_000) throw Error("Unexpected HTML response size")
  if (!/<div\s+id=["']root["']/.test(html)) throw Error("Missing React root element")
  if (!/<title>Opportunity Scout\b/.test(html)) throw Error("Missing app title")
  const elements = [...html.matchAll(/<(script|link)\b[^>]*>/gi)]
  const paths = new Map()
  const baseUrl = new URL(base)
  for (const matched of elements) {
    const tag = matched[0]
    const source = tag.match(/\b(?:src|href)\s*=\s*["']([^"']+)["']/i)?.[1]
    if (!source) continue
    const isScript = matched[1].toLowerCase() === "script"
    const isStylesheet = !isScript && /\brel\s*=\s*["']stylesheet["']/i.test(tag)
    if (!isScript && !isStylesheet) continue
    const url = new URL(source, baseUrl)
    if (url.origin !== baseUrl.origin || !url.pathname.startsWith(baseUrl.pathname.replace(/\/?$/, "/") + "assets/")) {
      throw Error("Asset escaped expected public path: " + source)
    }
    const expectedExtension = isScript ? ".js" : ".css"
    if (!url.pathname.endsWith(expectedExtension)) throw Error("Unexpected asset extension")
    paths.set(url.href, isScript ? "js" : "css")
  }
  if (![...paths.values()].includes("js") || ![...paths.values()].includes("css")) {
    throw Error("Missing hashed JS or CSS bundle")
  }
  return [...paths.entries()].map(([url,kind])=>({url,kind}))
}

/** Verify browser-tab, PNG fallback and iOS home-screen icons are served under the configured subpath. */
export function extractBrandAssets(html, base = LIVE) {
  if (typeof html !== "string" || html.length > 2_000_000) throw Error("Unexpected HTML response size")
  const baseUrl = new URL(base)
  const prefix = baseUrl.pathname.replace(/\/?$/, "/")
  const linkTags = [...html.matchAll(/<link\b[^>]*>/gi)].map((match) => match[0])
  const attr = (tag, name) => tag.match(new RegExp("\\b" + name + "\\s*=\\s*[\"']([^\"']+)[\"']", "i"))?.[1] || ""
  const required = [
    { rel: "icon", type: "image/svg+xml", file: "favicon.svg", mime: "image/svg+xml" },
    { rel: "icon", type: "image/png", file: "favicon-32.png", mime: "image/png" },
    { rel: "apple-touch-icon", type: null, file: "apple-touch-icon.png", mime: "image/png" },
  ]
  return required.map(({ rel, type, file, mime }) => {
    const tag = linkTags.find((link) => attr(link, "rel") === rel && (type === null || attr(link, "type") === type))
    if (!tag) throw Error("Missing favicon/touch icon declaration: " + file)
    const url = new URL(attr(tag, "href"), baseUrl)
    if (url.origin !== baseUrl.origin || url.pathname !== prefix + file) {
      throw Error("Brand icon outside expected deployment path: " + file)
    }
    return { url: url.href, mime }
  })
}

async function fetchOk(url, method="GET") {
  const response = await fetch(url,{method,signal:AbortSignal.timeout(12000),
    redirect:"error",headers:{"User-Agent":"OpportunityScoutLiveMonitor/1.0","Cache-Control":"no-cache"}})
  if (!response.ok) throw Error(method + " " + response.status + " " + url)
  return response
}

export async function runLiveCheck(url = LIVE) {
  const checkedAt = new Date().toISOString()
  const page=await fetchOk(url)
  const html=await page.text()
  const assets=extractAssets(html,url)
  const brandAssets=extractBrandAssets(html,url)
  for (const asset of assets){
    const response = await fetchOk(asset.url,"HEAD")
    const contentType = response.headers.get("content-type") || ""
    if(asset.kind==="js" && !/javascript/i.test(contentType)) throw Error("JS MIME mismatch: " + contentType)
    if(asset.kind==="css" && !/text\/css/i.test(contentType)) throw Error("CSS MIME mismatch: " + contentType)
  }
  for (const icon of brandAssets) {
    const response = await fetchOk(icon.url,"HEAD")
    const contentType = response.headers.get("content-type") || ""
    if (!contentType.toLowerCase().includes(icon.mime)) {
      throw Error("Favicon/touch icon MIME mismatch: " + icon.url + " " + contentType)
    }
  }
  const result={checked_at:checkedAt,site:url,status:"healthy",asset_count:assets.length,icon_count:brandAssets.length,
    notes:"Public HTML, JS/CSS, and favicon/touch icons only; browser features are tested in PR/main CI."}
  console.log("Production static smoke: "+JSON.stringify(result))
  if(process.env.GITHUB_STEP_SUMMARY)appendFileSync(process.env.GITHUB_STEP_SUMMARY,
    "### Live Opportunity Scout site check\n"+
    "- Status: **healthy**\n- URL: "+url+"\n- Static assets: "+assets.length+"\n"+
    "- This is an HTTP/asset check; browser workflow coverage runs in deployment CI.\n")
  return result
}

if(process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href){
  runLiveCheck().catch(e=>{console.error(e);process.exitCode=1})
}
