import { readFileSync, mkdirSync, writeFileSync } from "node:fs"
import { resolve, dirname } from "node:path"
import { fileURLToPath, pathToFileURL } from "node:url"

const ROOT=resolve(dirname(fileURLToPath(import.meta.url)),"..")
const API="https://api.smartrecruiters.com/v1/companies/TheUniversityOfAuckland/postings"
const JOB_ROLE=/\b(post[\s-]?doc(?:toral)?|research fellow|research scientist|research associate|lecturer|senior lecturer|assistant professor|researcher)\b/i
const ACADEMIC_EXCLUDE=/product manager|administrator|recruitment|marketing|communication partner|finance|hr business partner/i
const SUBJECTS=[
 {pattern:/telecom|wireless|5g\b|6g\b|radio.frequency|antenna|rf\b|visible.light|optical.wireless|signal.processing|communication.network/i,tag:"Telecommunications",score:8},
 {pattern:/artificial.intelligence|\bai\b|machine.learning|deep.learning|neural.network|generative.ai|large.language.model|llm\b/i,tag:"Artificial Intelligence",score:6},
 {pattern:/autonomous|agentic|multi.agent|intelligent.agent|robotic|reinforcement.learning|closed.loop.control/i,tag:"Autonomous Systems",score:6},
 {pattern:/internet.of.things|\biot\b|edge.comput|sensor.network|embedded.system/i,tag:"IoT/Edge",score:5},
 {pattern:/computer.science|data.science|cyber.security|cybersecurity|information.systems|complex.systems/i,tag:"Computer Science",score:3},
]
const MAX_PUBLIC_JOBS=24
const SOURCE_COUNTRY="nz"
const text=(s)=>String(s??"").replace(/<[^>]*>/g," ").replace(/&(?:amp|nbsp|lt|gt|quot);/gi," ").replace(/\s+/g," ").trim().slice(0,10000)
const candidateId=(id)=>/^[0-9a-z-]{3,80}$/i.test(String(id))?String(id):null
export function jobScore(title,description=""){
 const name=text(title),body=text(description)
 if(!JOB_ROLE.test(name)||ACADEMIC_EXCLUDE.test(name))return null
 const matches=SUBJECTS.filter(x=>x.pattern.test(name+" "+body))
 const strong=matches.filter(x=>x.score>=5)
 if(!strong.length)return null
 const titleBonus=SUBJECTS.filter(x=>x.pattern.test(name)).reduce((v,x)=>v+x.score,0)
 const score=Math.min(99,Math.round(matches.reduce((v,x)=>v+x.score,0)*3 + titleBonus*2))
 if(score<16)return null
 return {topics:matches.map(x=>x.tag),score}
}
export function normalizePosting(summary,details){
 const id=candidateId(summary?.id)
 if(!id)return null
 const location=summary.location||details?.location||{}
 if(String(location.country||"").toLowerCase()!==SOURCE_COUNTRY)return null
 const title=text(details?.name||summary?.name)
 const sections=details?.jobAd?.sections||{}
 const description=[sections.jobDescription?.text,sections.qualifications?.text].map(text).join(" ")
 const ranked=jobScore(title,description)
 if(!ranked)return null
 // Deliberately prefer the vendor's public job page. Never use source-provided arbitrary redirect links.
 const officialUrl="https://jobs.smartrecruiters.com/TheUniversityOfAuckland/"+id
 const release=typeof summary.releasedDate==="string" && !Number.isNaN(Date.parse(summary.releasedDate)) ?
   summary.releasedDate.slice(0,10) : null
 return {
  id:"uoa-auto-"+id,title:title.slice(0,180),employer:"University of Auckland",
  city:text(location.city||"Auckland").slice(0,80),role:/post[\s-]?doc/i.test(title)?"postdoc":/lecturer/i.test(title)?"lecturer":"researcher",
  topics:ranked.topics,fit:ranked.score>=55?"high":"medium",fit_note:"Máy phát hiện theo mô tả vị trí; cần đọc yêu cầu trên trang chính thức để đối chiếu chuyên ngành và visa.",
  salary_nzd_year:null,contract:"Thông tin tuyển dụng trên cổng SmartRecruiters",deadline_day:null,
  status:"auto_candidate",published_at:release,source_url:officialUrl,
  eligibility_note:"Chưa thẩm định tư cách ứng tuyển và quy định visa.",international_note:"Chưa xác minh quyền làm việc tại New Zealand.",
  requirements:["Mở tin tuyển dụng chính thức","Xác nhận hạn nộp và tư cách PhD","Chuẩn bị CV học thuật, công bố khoa học và cover letter"],
  reviewed_at:null,match_score:ranked.score
 }
}
export async function discoverJobs(fetcher=fetch,now=new Date()){
 const timeout=async(url)=>{
  const response=await fetcher(url,{headers:{accept:"application/json"},signal:AbortSignal.timeout(15000)})
  if(!response.ok)throw Error("Official SmartRecruiters API HTTP "+response.status)
  const json=await response.json()
  if(!json||typeof json!=="object")throw Error("Invalid official job listing JSON")
  return json
 }
 const summaries=[]
 for(let offset=0;offset<300;offset+=100){
  const page=await timeout(API+"?limit=100&offset="+offset+"&country=nz")
  if(!Array.isArray(page.content))throw Error("No job content returned by official API")
  summaries.push(...page.content)
  if(offset+100>=Math.min(Number(page.totalFound)||0,300)||page.content.length<100)break
 }
 const likely=summaries.filter(x=>JOB_ROLE.test(String(x.name||""))&&!ACADEMIC_EXCLUDE.test(String(x.name||""))).slice(0,65)
 const details=await Promise.all(likely.map(async row=>{
  const id=candidateId(row.id)
  if(!id)return null
  try{return normalizePosting(row,await timeout(API+"/"+id))}
  catch{return null}
 }))
 const unique=new Map()
 for(const job of details.filter(Boolean)){if(!unique.has(job.id))unique.set(job.id,job)}
 const listings=[...unique.values()].sort((a,b)=>b.match_score-a.match_score || a.title.localeCompare(b.title)).slice(0,MAX_PUBLIC_JOBS)
 return {
  generated_at:now.toISOString(),source:"SmartRecruiters public company Posting API · University of Auckland",
  scope:"Machine-selected active postings from the official job API. Verify deadline, PhD eligibility, working rights and continued availability manually before applying.",
  observed_count:summaries.length,candidate_count:likely.length,listings
 }
}
export async function main(){
 const output=resolve(ROOT,"public/nz-academic-jobs-auto.json")
 const file=await discoverJobs()
 mkdirSync(dirname(output),{recursive:true})
 writeFileSync(output,JSON.stringify(file,null,2)+"\n")
 console.log("NZ academic jobs: "+file.listings.length+" candidate listings; "+file.observed_count+" postings observed")
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
 main().catch(error=>{console.error("Academic job discovery failed:",error);process.exitCode=1})
}
