import { test, expect } from "@playwright/test"
import { readFile } from "node:fs/promises"

const ROOT="/opportunity-dashboard/"
const mockEmpty=page=>page.route("**/nz-academic-jobs-auto.json",route=>route.fulfill({status:200,contentType:"application/json",body:JSON.stringify({generated_at:null,listings:[]})}))
test("new NZ Academic Jobs route shows official vacancy and clear deadline/visa caveats",async({page})=>{
 await mockEmpty(page)
 await page.goto(ROOT+"#nz-jobs")
 await expect(page.getByRole("heading",{name:"Research, Postdoc & Faculty Positions"})).toBeVisible()
 await expect(page.getByText("Postdoctoral Research Fellow — Autonomous Agency")).toBeVisible()
 await expect(page.getByText("13/10/2026 (NZ)")).toBeVisible()
 await expect(page.getByText("Hạn trên nguồn chính thức")).toBeVisible()
 await expect(page.getByText("Lecturer — Data Science / Artificial Intelligence")).toHaveCount(0)
 await expect(page.getByRole("link",{name:/Xem \/ Apply/}).first()).toHaveAttribute("target","_blank")
 await expect(page.getByRole("combobox",{name:"Lọc toàn bộ dashboard theo dự án"})).toHaveCount(0)
})
test("NZ job filters distinguish postdoc, lecturer and research specialties",async({page})=>{
 await mockEmpty(page)
 await page.goto(ROOT+"#nz-jobs")
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
 await page.goto(ROOT+"#nz-jobs")
 await page.getByRole("button",{name:/Theo dõi trường & viện/}).click()
 await expect(page.getByText("University of Canterbury — Wireless Research Centre")).toBeVisible()
 await expect(page.getByText("closed 27 Sep 2026",{exact:false})).toBeVisible()
 await expect(page.getByText("không phải tin đang tuyển",{exact:false})).toBeVisible()
 await expect(page.getByRole("link",{name:/Tuyển dụng chính thức/}).first()).toHaveAttribute("target","_blank")
})
test("academic application tracking is browser-private and survives reload and JSON download",async({page})=>{
 await mockEmpty(page)
 await page.goto(ROOT+"#nz-jobs")
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
 await page.goto(ROOT+"#nz-jobs")
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
 await page.goto(ROOT+"#nz-jobs")
 await expect(page.getByRole("heading",{name:"Research, Postdoc & Faculty Positions"})).toBeVisible()
 const dims=await page.evaluate(()=>({body:document.documentElement.scrollWidth,viewport:window.innerWidth}))
 expect(dims.body).toBeLessThanOrEqual(dims.viewport+1)
})

test("NZ career fit controls and confirmed all-day deadline reminder",async({page})=>{
 await mockEmpty(page)
 await page.goto(ROOT+"#nz-jobs")
 const ranking=page.getByRole("combobox",{name:"Ưu tiên hồ sơ tiến sĩ"})
 await ranking.click()
 await page.getByRole("option",{name:"Ưu tiên AI / Autonomous"}).click()
 await expect(ranking).toContainText("Ưu tiên AI / Autonomous")
 const verifyOnly=page.getByRole("checkbox",{name:"Chỉ có hạn nộp chính thức"})
 await verifyOnly.check()
 await expect(page.getByText("Postdoctoral Research Fellow — Autonomous Agency")).toBeVisible()
 await expect(page.getByText("Lecturer — Data Science / Artificial Intelligence")).toHaveCount(0)
 const wait=page.waitForEvent("download")
 await page.getByRole("button",{name:/Nhắc hạn/}).click()
 const file=await wait
 const ics=await readFile(await file.path(),"utf8")
 expect(ics).toContain("DTSTART;VALUE=DATE:20261013")
 expect(ics).toContain("Check exact NZ local closing time")
})

test("expired academic lecturer and Canterbury UAV engineer are hidden from actionable jobs",async({page})=>{
 await mockEmpty(page)
 await page.goto(ROOT+"#nz-jobs")
 await expect(page.getByText("Lecturer — Data Science / Artificial Intelligence")).toHaveCount(0)
 await expect(page.getByText("Research Engineer — Autonomous Robotics and UAV Research")).toHaveCount(0)
 await page.getByRole("combobox",{name:"Lọc trạng thái việc làm"}).click()
 await page.getByRole("option",{name:"Kể cả đã hết hạn"}).click()
 await expect(page.getByText("Lecturer — Data Science / Artificial Intelligence")).toBeVisible()
 await expect(page.getByText("Research Engineer — Autonomous Robotics and UAV Research")).toBeVisible()
 await expect(page.getByText("Đã hết hạn").first()).toBeVisible()
})

test("quick-save creates a private academic checklist and preserves it after reload/export",async({page})=>{
 await mockEmpty(page)
 await page.goto(ROOT+"#nz-jobs")
 await page.getByRole("button",{name:/^Lưu việc làm: Postdoctoral Research Fellow/}).click()
 await page.getByRole("group",{name:"Chọn khu vực việc làm"}).getByRole("button",{name:/Hồ sơ của tôi/}).click()
 await expect(page.getByRole("heading",{name:"Hồ sơ ứng tuyển của tôi"})).toBeVisible()
 await page.getByRole("checkbox",{name:/CV học thuật và danh sách công bố: Postdoctoral/}).check()
 const done=page.getByRole("progressbar",{name:/Checklist: Postdoctoral Research Fellow/})
 await expect(done).toHaveAttribute("aria-valuenow","20")
 await page.getByRole("textbox",{name:"Bước tiếp theo (cá nhân)"}).fill("Contact prospective research mentor")
 await page.getByRole("textbox",{name:"Ghi chú ứng tuyển"}).fill("Publication list prepared")
 await page.reload()
 await page.getByRole("group",{name:"Chọn khu vực việc làm"}).getByRole("button",{name:/Hồ sơ của tôi/}).click()
 await expect(page.getByRole("checkbox",{name:/CV học thuật và danh sách công bố: Postdoctoral/})).toBeChecked()
 await expect(page.getByRole("textbox",{name:"Bước tiếp theo (cá nhân)"})).toHaveValue("Contact prospective research mentor")
 await expect(page.getByRole("textbox",{name:"Ghi chú ứng tuyển"})).toHaveValue("Publication list prepared")
 const waiting=page.waitForEvent("download")
 await page.getByRole("button",{name:"Xuất",exact:true}).click()
 const file=await waiting
 const data=JSON.parse(await readFile(await file.path(),"utf8"))
 const item=data.items["uoa-2026-autonomous-agency-60022330"]
 expect(item.status).toBe("saved")
 expect(item.checked).toContain("cv")
 expect(item.next_step).toBe("Contact prospective research mentor")
})
test("job compare helps compare multiple official roles and works on mobile",async({page})=>{
 await mockEmpty(page)
 await page.setViewportSize({width:390,height:844})
 await page.goto(ROOT+"#nz-jobs")
 await page.getByRole("combobox",{name:"Lọc trạng thái việc làm"}).click()
 await page.getByRole("option",{name:"Kể cả đã hết hạn"}).click()
 await page.getByRole("button",{name:/^So sánh: Postdoctoral Research Fellow/}).click()
 await page.getByRole("button",{name:/^So sánh: Lecturer — Data Science/}).click()
 const comparison=page.getByRole("region",{name:"So sánh vị trí học thuật"})
 await expect(comparison).toContainText("So sánh vị trí (2/3)")
 await expect(comparison.getByText("Lecturer — Data Science / Artificial Intelligence")).toBeVisible()
 const dimensions=await page.evaluate(()=>({scroll:document.documentElement.scrollWidth,viewport:window.innerWidth}))
 expect(dimensions.scroll).toBeLessThanOrEqual(dimensions.viewport+2)
 await comparison.getByRole("button",{name:/Bỏ so sánh: Lecturer/}).click()
 await expect(comparison).toContainText("So sánh vị trí (1/3)")
})
test("academic employer filtering, sorting and reset expose relevant results",async({page})=>{
 await mockEmpty(page)
 await page.goto(ROOT+"#nz-jobs")
 await page.getByRole("combobox",{name:"Lọc trạng thái việc làm"}).click()
 await page.getByRole("option",{name:"Kể cả đã hết hạn"}).click()
 await page.getByRole("combobox",{name:"Lọc theo đại học và tổ chức tuyển dụng"}).click()
 await page.getByRole("option",{name:"University of Canterbury",exact:true}).click()
 await expect(page.getByText("Research Engineer — Autonomous Robotics and UAV Research")).toBeVisible()
 await expect(page.getByText("Postdoctoral Research Fellow — Autonomous Agency")).toHaveCount(0)
 await page.getByRole("combobox",{name:"Sắp xếp vị trí học thuật"}).click()
 await page.getByRole("option",{name:"Phù hợp chuyên môn",exact:true}).click()
 await page.getByRole("button",{name:"Xóa bộ lọc"}).click()
 await expect(page.getByText("Postdoctoral Research Fellow — Autonomous Agency")).toBeVisible()
 await expect(page.getByText("Research Engineer — Autonomous Robotics and UAV Research")).toHaveCount(0)
})
test("institution watchlist search filters the future-hiring sources, not live vacancies",async({page})=>{
 await mockEmpty(page)
 await page.goto(ROOT+"#nz-jobs")
 await page.getByRole("button",{name:/Theo dõi trường & viện/}).click()
 await page.getByRole("textbox",{name:"Tìm trường và viện nghiên cứu tại New Zealand"}).fill("Wireless Research Centre")
 await expect(page.getByText("University of Canterbury — Wireless Research Centre")).toBeVisible()
 await expect(page.getByText("University of Otago — Current Vacancies")).toHaveCount(0)
})


test("saved API candidate remains in private application workspace after automatic feed removes it",async({page})=>{
 const candidate={
  id:"uoa-auto-999999997",title:"Research Fellow - Applied Wireless Learning",
  employer:"University of Auckland",city:"Auckland",role:"researcher",
  topics:["Telecommunications","Artificial Intelligence"],fit:"high",
  fit_note:"Screened candidate only; check employer requirements",salary_nzd_year:null,
  contract:"Fixed term",deadline_day:null,status:"auto_candidate",published_at:"2026-10-09",
  source_url:"https://jobs.smartrecruiters.com/TheUniversityOfAuckland/999999997",
  eligibility_note:"Unverified PhD requirements",international_note:"Visa not verified",
  requirements:["Check PhD eligibility"],reviewed_at:null,
 }
 let report={generated_at:new Date().toISOString(),listings:[candidate]}
 await page.route("**/nz-academic-jobs-auto.json",route=>route.fulfill({
  status:200,contentType:"application/json",body:JSON.stringify(report),
 }))
 await page.goto(ROOT+"#nz-jobs")
 await expect(page.getByText(candidate.title)).toBeVisible()
 await page.getByRole("button",{name:"Lưu việc làm: "+candidate.title}).click()
 await page.getByRole("group",{name:"Chọn khu vực việc làm"}).getByRole("button",{name:/Hồ sơ của tôi/}).click()
 await page.getByRole("checkbox",{name:/CV học thuật và danh sách công bố: Research Fellow - Applied Wireless/}).check()
 await page.getByRole("textbox",{name:"Bước tiếp theo (cá nhân)"}).fill("Email PI about research fit")
 await page.getByRole("textbox",{name:"Ghi chú ứng tuyển"}).fill("I have tailored research CV")
 // University removes the posting from the next successful scanner run.
 report={...report,generated_at:new Date().toISOString(),listings:[]}
 await page.reload()
 await expect(page.getByText(candidate.title)).toHaveCount(0)
 await page.getByRole("group",{name:"Chọn khu vực việc làm"}).getByRole("button",{name:/Hồ sơ của tôi/}).click()
 await expect(page.getByText(candidate.title)).toBeVisible()
 await expect(page.getByText("Tin đã rời nguồn hiện hành")).toBeVisible()
 await expect(page.getByRole("checkbox",{name:/CV học thuật và danh sách công bố: Research Fellow - Applied Wireless/})).toBeChecked()
 await expect(page.getByRole("textbox",{name:"Bước tiếp theo (cá nhân)"})).toHaveValue("Email PI about research fit")
 await expect(page.getByRole("textbox",{name:"Ghi chú ứng tuyển"})).toHaveValue("I have tailored research CV")
 const dl=page.waitForEvent("download")
 await page.getByRole("button",{name:"Xuất",exact:true}).click()
 const downloaded=await dl
 const content=await readFile(await downloaded.path(),"utf8")
 const backup=JSON.parse(content)
 expect(backup.items[candidate.id].job_snapshot.title).toBe(candidate.title)
 expect(backup.items[candidate.id].job_snapshot.status).toBeUndefined()
 // Wipe the NZ-specific data only after a deliberate confirmation, then restore.
 await page.getByRole("button",{name:"Xóa dữ liệu NZ Jobs trong trình duyệt"}).click()
 await expect(page.getByRole("button",{name:"Xác nhận xóa NZ Jobs"})).toBeVisible()
 await page.getByRole("button",{name:"Hủy"}).click()
 await expect(page.getByText(candidate.title)).toBeVisible()
 await page.getByRole("button",{name:"Xóa dữ liệu NZ Jobs trong trình duyệt"}).click()
 await page.getByRole("button",{name:"Xác nhận xóa NZ Jobs"}).click()
 await expect(page.getByText(candidate.title)).toHaveCount(0)
 await page.locator('input[type="file"][accept=".json,application/json"]').setInputFiles({
  name:"my-nz-backup.json",mimeType:"application/json",buffer:Buffer.from(content),
 })
 await expect(page.getByText(candidate.title)).toBeVisible()
 await expect(page.getByRole("textbox",{name:"Ghi chú ứng tuyển"})).toHaveValue("I have tailored research CV")
})

test("malformed recruiter metadata is rejected without hiding verified manual vacancies",async({page})=>{
 const invalid={generated_at:new Date().toISOString(),
  listings:[{id:"uoa-auto-999999999",title:"Postdoctoral Fellow - AI",
   employer:"University of Auckland",city:"Auckland",role:"postdoc",
   topics:["Artificial Intelligence"],fit:"high",fit_note:"candidate",salary_nzd_year:null,
   contract:"Fixed term",deadline_day:null,status:"auto_candidate",published_at:null,
   source_url:"https://jobs.smartrecruiters.com/TheUniversityOfAuckland/999999999",
   eligibility_note:"Unverified",international_note:"Unverified",
   requirements:{error:"malformed"},reviewed_at:null,
  }]
 }
 await page.route("**/nz-academic-jobs-auto.json",route=>route.fulfill({
  status:200,contentType:"application/json",body:JSON.stringify(invalid),
 }))
 await page.goto(ROOT+"#nz-jobs")
 await expect(page.getByText("Postdoctoral Research Fellow — Autonomous Agency")).toBeVisible()
 await expect(page.getByText("Postdoctoral Fellow - AI")).toHaveCount(0)
 await expect(page.getByText("Chưa có bản quét mới",{exact:false})).toBeVisible()
})
