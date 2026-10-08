import { canonicalUrl, validatePublicUrl } from "./source-utils.mjs"

const KEYWORDS=[
  ["artificial intelligence",8],["machine learning",7],["agentic",8],
  ["ai",5],["scientific",4],["research",3],["science",3],["innovation",3],
  ["cybersecurity",6],["cyber security",6],["autonomous",5],["wireless",5],
  ["communication",3],["robotics",5],["internet of things",5],["iot",5],
  ["healthcare",4],["medical",4],["biomedical",4],["startups",3],["startup",3],
  ["research fellowship",5],["energy",2],["semiconductor",5],["microelectronics",4],
  ["trí tuệ nhân tạo",8],["đổi mới sáng tạo",5],["nghiên cứu",5],
  ["tài trợ",3],["khoa học",4],["công nghệ",3],["doanh nghiệp",3],
  ["học bổng",4],["khởi nghiệp",5],["chuyển đổi số",4],
  ["an toàn thông tin",5],["robot",3],
]

function decodeXml(text) {
  return text.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/<[^>]+>/g, "")
    .replace(/&#(x[0-9a-f]+|\d+);/gi, (_,n)=> {
      const point = n[0].toLowerCase()==="x" ? parseInt(n.slice(1),16) : parseInt(n,10)
      return point>=0 && point<=0x10ffff ? String.fromCodePoint(point) : ""
    })
    .replace(/&(amp|lt|gt|quot|apos|nbsp);/gi, (_,name)=>({
      amp:"&",lt:"<",gt:">",quot:'"',apos:"'",nbsp:" "
    })[name.toLowerCase()])
    .trim()
}
function tag(xml,name) {
  const re=new RegExp("<"+name+"(?:\\s[^>]*)?>([\\s\\S]*?)<\\/"+name+">","i")
  const matched=xml.match(re)
  return matched?decodeXml(matched[1]):""
}
function atomHref(xml) {
  const matched=xml.match(/<link\b[^>]*\bhref\s*=\s*["']([^"']+)["'][^>]*\/?>/i)
  return matched?decodeXml(matched[1]):""
}

/** Restrict to RSS/Atom entries; ignore HTML, XML DTD/entities, feeds over 2 MB. */
export function parseFeed(xml) {
  if(typeof xml!=="string" || xml.length>2_000_000 || /<!DOCTYPE|<!ENTITY/i.test(xml)) throw new Error("Unexpected XML size or DTD")
  const rss=/<(?:rss|rdf:RDF)\b/i.test(xml),atom=/<feed\b/i.test(xml)
  if(!rss&&!atom) throw new Error("Expected an RSS or Atom feed")
  const pattern=rss?/<item\b[^>]*>([\s\S]*?)<\/item>/gi:/<entry\b[^>]*>([\s\S]*?)<\/entry>/gi
  const result=[]
  for(const match of xml.matchAll(pattern)){
    if(result.length>=500)break
    const body=match[1]
    const title=tag(body,"title").slice(0,250)
    const url=rss?tag(body,"link"):atomHref(body)
    const summary=(tag(body,"description")||tag(body,"summary")).slice(0,360)
    const published=(tag(body,"pubDate")||tag(body,"published")||tag(body,"updated")).slice(0,100)
    if(title&&url)result.push({title,url,summary,published})
  }
  return result
}

export function matchKeywords(title,summary="") {
  const searchable=(title+" "+summary).toLowerCase()
  const matches=KEYWORDS.filter(([word])=>{
    const pattern=new RegExp("(^|[^a-z0-9])"+word+"($|[^a-z0-9])","i")
    return pattern.test(searchable)
  })
  return {score:Math.min(50,matches.reduce((n,x)=>n+x[1],0)),keywords:matches.map(x=>x[0])}
}

export function selectCandidates(entries,config,existing=[],max=60) {
  const seen=new Set(existing.map((row)=>canonicalUrl(row.url)).filter(Boolean))
  const out=[]
  const allowed=String(config.official_host||"").toLowerCase()
  for(const row of entries){
    const guard=validatePublicUrl(row.url)
    if(!guard.safe)continue
    const host=guard.url.hostname.toLowerCase()
    if(host!==allowed && !host.endsWith("."+allowed))continue
    const canonical=canonicalUrl(row.url)
    if(!canonical||seen.has(canonical))continue
    seen.add(canonical)
    const matched=matchKeywords(row.title,row.summary)
    if(!matched.score)continue
    out.push({
      source_id:config.id,
      title:row.title,
      official_url:guard.url.href,
      summary:row.summary||"",
      published_at:row.published||"",
      keyword_score:matched.score,
      matched_keywords:matched.keywords,
      category_hint:config.category_hint||"",
      eligibility_caveat:config.eligibility_caveat||"",
      review_state:"requires_human_verification",
      deadline:"unknown",
      eligibility:"unknown",
      // NEVER automatically assign verified_at, amount, or claimed eligibility.
    })
  }
  return out.sort((a,b)=>b.keyword_score-a.keyword_score||a.title.localeCompare(b.title)).slice(0,max)
}
