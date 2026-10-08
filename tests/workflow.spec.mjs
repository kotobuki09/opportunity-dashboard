import { test, expect } from "@playwright/test"

const ROOT = "/opportunity-dashboard/"

test("status details are accessible by keyboard and locally persisted", async ({ page }) => {
  await page.goto(ROOT + "#explore")
  const row = page.locator('tbody tr[tabindex="0"]').first()
  await expect(row).toBeVisible()
  await row.focus()
  await page.keyboard.press("Enter")
  const action = page.getByRole("textbox", { name: "Bước tiếp theo" })
  await expect(action).toBeVisible()
  await action.fill("Browser QA")
  await page.getByRole("button", { name: "Đóng" }).click()
  await row.click()
  await expect(page.getByRole("textbox", { name: "Bước tiếp theo" })).toHaveValue("Browser QA")
  await page.getByRole("button", { name: "Xóa dữ liệu riêng của mục này" }).click()
  await page.getByRole("button", { name: "Xác nhận xóa" }).click()
  await expect(page.getByRole("textbox", { name: "Bước tiếp theo" })).toHaveValue("")
})

test("mobile opportunity cards open detailed information", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto(ROOT + "#explore")
  await expect(page.getByRole("textbox", { name: "Tìm cơ hội" })).toBeVisible()
  const item = page.getByRole("button", { name: /^Xem chi tiết:/ }).first()
  await expect(item).toBeVisible()
  await item.click()
  await expect(page.getByRole("textbox", { name: "Bước tiếp theo" })).toBeVisible()
})
