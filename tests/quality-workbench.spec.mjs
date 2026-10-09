import { test, expect } from "@playwright/test"
import { readFile } from "node:fs/promises"

const ROOT="/opportunity-dashboard/"

test("quality workbench separates verification, normalization and unknown application state",async ({page})=>{
  await page.goto(ROOT+"#quality")
  await expect(page.getByRole("heading",{name:"Trung tâm chất lượng dữ liệu"})).toBeVisible()
  await expect(page.getByText("Hàng đợi chuẩn hoá & kiểm định")).toBeVisible()
  const filters=page.getByRole("group",{name:"Bộ lọc kiểm định"})
  const normalize=filters.getByRole("button",{name:/Chưa chuẩn hoá/})
  await normalize.click()
  await expect(normalize).toHaveAttribute("aria-pressed","true")
  await expect(page.getByText("Chưa phân loại quyền lợi").first()).toBeVisible()

  const unverified=filters.getByRole("button",{name:/Chưa kiểm định nguồn/})
  await unverified.click()
  await expect(unverified).toHaveAttribute("aria-pressed","true")
  await expect(page.getByText("Chưa xác minh nguồn").first()).toBeVisible()

  const availability=filters.getByRole("button",{name:/Trạng thái chưa rõ/})
  await availability.click()
  await expect(availability).toHaveAttribute("aria-pressed","true")
  await expect(page.getByText(/Chưa rõ tình trạng nộp|Đã qua cut-off/).first()).toBeVisible()
})

test("quality review CSV contains only public quality fields and is downloadable",async({page})=>{
  await page.goto(ROOT+"#quality")
  const filter=page.getByRole("group",{name:"Bộ lọc kiểm định"})
  await filter.getByRole("button",{name:/Chưa chuẩn hoá/}).click()
  const wait=page.waitForEvent("download")
  await page.getByRole("button",{name:"Xuất danh sách CSV"}).click()
  const download=await wait
  expect(download.suggestedFilename()).toBe("opportunity-quality-review.csv")
  const data=await readFile(await download.path(),"utf8")
  expect(data[0]).toBe("\uFEFF")
  expect(data).toContain("Cần chuẩn hóa")
  expect(data).toContain("Các vấn đề")
  expect(data).toContain("URL nguồn chính thức")
  expect(data).not.toContain("private-notes")
})

test("overview makes missing normalization and verification actionable",async({page})=>{
  await page.goto(ROOT)
  await expect(page.getByText("Chưa chuẩn hoá & kiểm định")).toBeVisible()
  await page.getByRole("button",{name:/Xem hàng đợi/}).click()
  await expect(page).toHaveURL(/#quality$/)
  await expect(page.getByRole("heading",{name:"Trung tâm chất lượng dữ liệu"})).toBeVisible()
})

test("review queue is keyboard-accessible and pagination never silently drops items",async({page})=>{
  await page.goto(ROOT+"#quality")
  const queue=page.getByRole("group",{name:"Bộ lọc kiểm định"})
  await queue.getByRole("button",{name:/Tất cả/}).click()
  const more=page.getByRole("button",{name:/Xem thêm/})
  await expect(more).toBeVisible()
  await more.click()
  await expect(page.getByRole("button",{name:/Xem thêm/})).toBeVisible()
  const search=page.getByRole("textbox",{name:"Tìm trong hàng đợi kiểm định"})
  await search.fill("NAFOSTED")
  await expect(search).toHaveValue("NAFOSTED")
  await expect(page.getByRole("button",{name:/Xem thêm/})).toHaveCount(0)
})
