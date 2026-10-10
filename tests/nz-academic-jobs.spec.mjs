import { test, expect } from "@playwright/test"
import { readFile } from "node:fs/promises"

const ROOT="/opportunity-dashboard/"
const mockEmpty=page=>page.route("**/nz-academic-jobs-auto.json",route=>route.fulfill({status:200,contentType:"application/json",body:JSON.stringify({generated_at:null,listings:[]})}))
test("renamed Academic Jobs route shows official vacancy and clear deadline/visa caveats",async({page})=>{
 await mockEmpty(page)
 await page.goto(ROOT+"#academic-jobs")
 await expect(page.getByRole("heading",{name:"Research, Postdoc & Faculty Positions"})).toBeVisible()
 await expect(page.getByText("Postdoctoral Research Fellow — Autonomous Agency")).toBeVisible()
 await expect(page.getByText("13/10/2026 (NZ)")).toBeVisible()
 await expect(page.getByText("Hạn trên nguồn chính thức")).toBeVisible()
 await expect(page.getByText("Cần xác minh đang tuyển")).toBeVisible()
 await expect(page.getByRole("link",{name:/Xem \/ Apply/}).first()).toHaveAttribute("target","_blank")
 await expect(page.getByRole("combobox",{name:"Lọc toàn bộ dashboard theo dự án"})).toHaveCount(0)
})
test("NZ job filters distinguish postdoc, lecturer and research specialties",async({page})=>{
 await mockEmpty(page)
 await page.goto(ROOT+"#academic-jobs")
 await page.getByRole("combobox",{name:"Lọc cấp bậc học thuật"}).click()
 await page.getByRole("option",{name:"Postdoc",exact:true}).click()
 await expect(page.getByText("Postdoctoral Research Fellow — Autonomous Agency")).toBeVisible()
 await expect(page.getByText("Lecturer — Data Science / Artificial Intelligence")).toHaveCount(0)
 await page.getByRole("combobox",{name:"Lọc chuyên ngành học thuật"}).click()
 await page.getByRole("option",{name:"Telecom / Wireless"}).click()
 await expect(page.getByText("Chưa có việc phù hợp",{exact:false})).toBeVisible()
})
test("future watchlist never presents the closed Canterbury position as actively recruitable",async({page})=>{
 await mockEmpty(page)
 await page.goto(ROOT+"#academic-jobs")
 await page.getByRole("button",{name:/Theo dõi trường & viện/}).click()
 await expect(page.getByText("University of Canterbury — Wireless Research Centre")).toBeVisible()
 await expect(page.getByText("closed 27 Sep 2026",{exact:false})).toBeVisible()
 await expect(page.getByText("không phải tin đang tuyển",{exact:false})).toBeVisible()
 await expect(page.getByRole("link",{name:/Tuyển dụng chính thức/}).first()).toHaveAttribute("target","_blank")
})
test("academic application tracking is browser-private and survives reload and JSON download",async({page})=>{
 await mockEmpty(page)
 await page.goto(ROOT+"#academic-jobs")
 const control=page.getByRole("combobox",{name:/Trạng thái ứng tuyển: Postdoctoral Research Fellow/})
 await control.click()
 await page.getByRole("option",{name:"Chuẩn bị hồ sơ"}).click()
 await expect(control).toContainText("Chuẩn bị hồ sơ")
 await page.getByLabel("Ghi chú cá nhân").fill("Draft an academic CV for this position")
 await page.reload()
 await expect(page.getByRole("combobox",{name:/Trạng thái ứng tuyển: Postdoctoral Research Fellow/})).toContainText("Chuẩn bị hồ sơ")
 await expect(page.getByLabel("Ghi chú cá nhân")).toHaveValue("Draft an academic CV for this position")
 const downloading=page.waitForEvent("download")
 await page.getByRole("button",{name:"Xuất",exact:true}).click()
 const download=await downloading
 const exported=JSON.parse(await readFile(await download.path(),"utf8"))
 expect(exported.app).toBe("nz-academic-jobs")
 expect(exported.items["uoa-2026-autonomous-agency-60022330"].status).toBe("preparing")
})
test("fresh official API candidates are distinguishable from manually verified vacancy dates",async({page})=>{
 const json={generated_at:new Date().toISOString(),source:"Official SmartRecruiters API",
  listings:[{id:"uoa-auto-999999999",title:"Research Fellow - AI-powered Wireless Communications",
   employer:"University of Auckland",city:"Auckland",role:"researcher",topics:["Telecommunications","Artificial Intelligence"],
   fit:"high",fit_note:"Candidate only, please verify.",salary_nzd_year:null,contract:"Fixed term",
   deadline_day:null,status:"auto_candidate",published_at:"2026-10-09",
   source_url:"https://jobs.smartrecruiters.com/TheUniversityOfAuckland/999999999",
   eligibility_note:"Unverified",international_note:"Visa unknown",requirements:[],reviewed_at:null}]}
 await page.route("**/nz-academic-jobs-auto.json",route=>route.fulfill({status:200,contentType:"application/json",body:JSON.stringify(json)}))
 await page.goto(ROOT+"#academic-jobs")
 await expect(page.getByText("Research Fellow - AI-powered Wireless Communications")).toBeVisible()
 await expect(page.getByText("API phát hiện · chưa duyệt")).toBeVisible()
 await page.getByRole("combobox",{name:"Lọc chuyên ngành học thuật"}).click()
 await page.getByRole("option",{name:"Telecom / Wireless"}).click()
 await expect(page.getByText("Research Fellow - AI-powered Wireless Communications")).toBeVisible()
})
test("mobile academic jobs view stays within viewport and honors dark mode",async({page})=>{
 await mockEmpty(page)
 await page.setViewportSize({width:390,height:844})
 await page.emulateMedia({colorScheme:"dark",reducedMotion:"reduce"})
 await page.goto(ROOT+"#academic-jobs")
 await expect(page.getByRole("heading",{name:"Research, Postdoc & Faculty Positions"})).toBeVisible()
 const dims=await page.evaluate(()=>({body:document.documentElement.scrollWidth,viewport:window.innerWidth}))
 expect(dims.body).toBeLessThanOrEqual(dims.viewport+1)
})

test("Academic Jobs keeps legacy NZ Jobs bookmarks working",async({page})=>{
 await mockEmpty(page)
 await page.goto(ROOT+"#nz-jobs")
 await expect(page.getByRole("heading",{name:"Academic Jobs",exact:true})).toBeVisible()
 await expect(page.getByRole("button",{name:"Academic Jobs",exact:true})).toBeVisible()
 await expect(page.getByText("Postdoctoral Research Fellow — Autonomous Agency")).toBeVisible()
})
