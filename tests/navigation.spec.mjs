import { test, expect } from "@playwright/test"
import { readFile } from "node:fs/promises"

const ROOT = "/opportunity-dashboard/"

test("overview, priority recommendations and quality review are visible", async ({ page }) => {
  const errors = []
  page.on("pageerror", (error) => errors.push(error.message))
  await page.goto(ROOT)
  await expect(page.getByRole("heading", { name: "Tập trung vào cơ hội đáng hành động" })).toBeVisible()
  await expect(page.getByText("Ưu tiên gợi ý")).toBeVisible()
  await page.goto(ROOT + "#quality")
  await expect(page.getByRole("heading", { name: "Trung tâm chất lượng dữ liệu" })).toBeVisible()
  expect(errors).toEqual([])
})

test("project filter is persistent after a reload", async ({ page }) => {
  await page.goto(ROOT)
  const filter = page.getByRole("combobox", { name: "Lọc toàn bộ dashboard theo dự án" })
  await filter.click()
  await page.getByRole("option", { name: "AIMed" }).click()
  await page.reload()
  await expect(page.getByRole("combobox", { name: "Lọc toàn bộ dashboard theo dự án" })).toContainText("AIMed")
})

test("calendar download is a valid iCalendar document", async ({ page }) => {
  await page.goto(ROOT + "#calendar")
  const promise = page.waitForEvent("download")
  await page.getByRole("button", { name: "Xuất lịch .ics" }).click()
  const download = await promise
  const content = await readFile(await download.path(), "utf8")
  expect(download.suggestedFilename()).toMatch(/\.ics$/)
  expect(content).toContain("BEGIN:VCALENDAR")
  expect(content).toContain("TRIGGER:-P1D")
})

test("Kanban does not hide remaining items", async ({ page }) => {
  await page.goto(ROOT + "#board")
  const expand = page.getByRole("button", { name: /Xem toàn bộ \d+ cơ hội/ }).first()
  await expect(expand).toBeVisible()
  await expand.click()
  await expect(page.getByRole("button", { name: "Thu gọn danh sách" }).first()).toBeVisible()
})

test("browser Back returns to the previous workspace view", async ({ page }) => {
  await page.goto(ROOT)
  await page.getByRole("button", { name: /Pipeline hồ sơ/ }).click()
  await expect(page).toHaveURL(/#board$/)
  await page.getByRole("button", { name: /Lịch hạn nộp/ }).click()
  await expect(page).toHaveURL(/#calendar$/)
  await page.goBack()
  await expect(page).toHaveURL(/#board$/)
  await expect(page.getByRole("heading", { name: "Tiến độ hồ sơ" })).toBeVisible()
})
