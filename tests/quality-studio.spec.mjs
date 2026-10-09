import {test,expect} from "@playwright/test"
import {readFileSync} from "node:fs"
import {promises as fs} from "node:fs"
import {createHash} from "node:crypto"

const ROOT="/opportunity-dashboard/"
const items=JSON.parse(readFileSync(new URL("../data/seen.json",import.meta.url),"utf8"))
const entry=items.find(x=>!x.verified_at&&(!x.stage_req||!x.eligibility_note))||items[0]
const sourceDigest=createHash("sha256").update(JSON.stringify(items.map(x=>x.url).sort())).digest("hex")

test("Quality Studio shows actions and truthful source-health reachability",async({page})=>{
 const report={generated_at:new Date().toISOString(),source_digest:sourceDigest,total:items.length,checked:2,counts:{reachable:1,restricted:1},
  results:[{url:entry.url,health:"restricted",status_code:403},
   {url:items.find(x=>x.url!==entry.url).url,health:"reachable",status_code:200}]}
 await page.route("**/source-health.json",route=>route.fulfill({status:200,contentType:"application/json",body:JSON.stringify(report)}))
 await page.goto(ROOT+"#quality")
 await expect(page.getByRole("heading",{name:"Chất lượng dữ liệu, trước khi hành động"})).toBeVisible()
 await expect(page.getByText("Hàng đợi chuẩn hoá & kiểm định")).toBeVisible()
 const filters=page.getByRole("group",{name:"Bộ lọc kiểm định"})
 await filters.getByRole("button",{name:/Lỗi \/ chặn truy cập/}).click()
 await expect(page.getByText("Bị giới hạn",{exact:false}).first()).toBeVisible()
 await expect(page.getByRole("button",{name:"Kiểm định: "+entry.title,exact:true})).toBeVisible()
 await page.getByRole("button",{name:"Kiểm định: "+entry.title,exact:true}).click()
 await expect(page.getByRole("complementary",{name:"Hồ sơ kiểm định đã chọn"})).toBeVisible()
 await expect(page.getByText("HTTP: Bị giới hạn (403)",{exact:false})).toBeVisible()
 await expect(page.getByText("không chứng minh đang nhận hồ sơ",{exact:false}).first()).toBeVisible()
})

test("editor downloads reviewable source-backed proposal without modifying public records",async({page})=>{
 await page.goto(ROOT+"#quality")
 await page.getByRole("button",{name:/Kiểm định:/}).first().click()
 await page.getByRole("button",{name:"Biên tập"}).click()
 await page.getByLabel("Yêu cầu giai đoạn").fill("Review proposal stage validated in test")
 await page.getByLabel("Nội dung chứng cứ").fill("This requirement is stated in the official program eligibility section.")
 await page.getByRole("checkbox").check()
 const wait=page.waitForEvent("download")
 await page.getByRole("button",{name:"Xuất đề xuất"}).click()
 const download=await wait
 expect(download.suggestedFilename()).toMatch(/^review-proposal-[\w-]+\.json$/)
 const content=JSON.parse(await fs.readFile(await download.path(),"utf8"))
 expect(content.kind).toBe("opportunity-scout.editorial-proposal")
 expect(content.changes.stage_req.after).toBe("Review proposal stage validated in test")
 expect(content.review_evidence[0].field).toBe("stage_req")
 expect(content.review_evidence[0].source_url).toMatch(/^https:\/\//)
 expect(content.verified_at).toBeUndefined()
 expect(content.needs_human_review).toBe(true)
})

test("mobile editorial selection and dark-mode typography remain usable",async({page})=>{
 await page.setViewportSize({width:390,height:844})
 await page.emulateMedia({colorScheme:"dark",reducedMotion:"reduce"})
 await page.goto(ROOT+"#quality")
 await expect(page.getByRole("heading",{name:"Chất lượng dữ liệu, trước khi hành động"})).toBeVisible()
 await page.getByRole("button",{name:/Kiểm định:/}).first().click()
 await expect(page.getByRole("complementary",{name:"Hồ sơ kiểm định đã chọn"})).toBeVisible()
 await expect(page.getByRole("button",{name:"Biên tập"})).toBeVisible()
 await page.screenshot({path:"test-results/quality-studio-mobile.png",fullPage:true})
})

test("missing source data is disclosed instead of displaying fictitious HTTP success",async({page})=>{
 await page.route("**/source-health.json",route=>route.abort())
 await page.goto(ROOT+"#quality")
 await expect(page.getByText("Chưa có snapshot công khai",{exact:false})).toBeVisible()
 await expect(page.getByText("Đang chờ bản quét nguồn")).toBeVisible()
})

test("review progress persists in the existing private backup without faking verification",async({page})=>{
 await page.goto(ROOT+"#quality")
 await page.getByRole("button",{name:/^Kiểm định:/}).first().click()
 const progress=page.getByRole("combobox",{name:"Tiến độ rà soát riêng"})
 await progress.click()
 await page.getByRole("option",{name:"Đang đối chiếu"}).click()
 await expect(progress).toContainText("Đang đối chiếu")
 const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem("oppScout.v1")||"{}"))
 const all=Object.values(saved.items||{})
 expect(all.some(x=>x.reviewPhase==="checking"&&/^[a-f0-9]{8}$/.test(x.reviewStamp))).toBe(true)
 await page.reload()
 await page.getByRole("button",{name:/^Kiểm định:/}).first().click()
 await expect(page.getByRole("combobox",{name:"Tiến độ rà soát riêng"})).toContainText("Đang đối chiếu")
 await page.getByRole("combobox",{name:"Lọc tiến độ rà soát cá nhân"}).click()
 await page.getByRole("option",{name:"Đang đối chiếu"}).click()
 await expect(page.getByRole("button",{name:/^Kiểm định:/})).toHaveCount(1)
})
test("mismatched scanner population hides stale HTTP badges and totals",async({page})=>{
 const report={generated_at:new Date().toISOString(),source_digest:"a".repeat(64),total:items.length,checked:1,
  results:[{url:entry.url,health:"missing",status_code:404}]}
 await page.route("**/source-health.json",route=>route.fulfill({status:200,contentType:"application/json",body:JSON.stringify(report)}))
 await page.goto(ROOT+"#quality")
 await expect(page.getByText("Bản quét không khớp dữ liệu")).toBeVisible()
 await expect(page.getByText("Bản quét khác tập URL hiện tại",{exact:false})).toBeVisible()
 await expect(page.getByText("—",{exact:true})).toHaveCount(3)
 const link=page.getByRole("group",{name:"Bộ lọc kiểm định"}).getByRole("button",{name:/Lỗi \/ chặn truy cập/})
 await expect(link).toContainText("0")
})
