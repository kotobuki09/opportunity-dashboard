import { test, expect } from "@playwright/test"

const ROOT = "/opportunity-dashboard/"

test("high-contrast favicon and touch icon load from the GitHub Pages subpath", async ({ page }) => {
  await page.goto(ROOT)
  await expect(page.locator('link[rel="icon"][type="image/svg+xml"]'))
    .toHaveAttribute("href", ROOT + "favicon.svg?v=2")
  await expect(page.locator('link[rel="apple-touch-icon"]'))
    .toHaveAttribute("href", ROOT + "apple-touch-icon.png?v=2")
  await expect(page.locator('img[src*="favicon.svg"]'))
    .toHaveAttribute("src", ROOT + "favicon.svg?v=2")

  const svg = await page.request.get(ROOT + "favicon.svg?v=2")
  expect(svg.ok()).toBeTruthy()
  expect(svg.headers()["content-type"]).toMatch(/image\/svg\+xml/)
  const svgText = await svg.text()
  expect(svgText).toContain('fill="#2563EB"')
  expect(svgText).toContain('stroke="#F8FBFF"')
  expect(svgText).toContain('fill="#FDE68A"')

  for (const filename of ["favicon-32.png", "apple-touch-icon.png"]) {
    const response = await page.request.get(ROOT + filename + "?v=2")
    expect(response.ok(), filename).toBeTruthy()
    expect(response.headers()["content-type"]).toMatch(/image\/png/)
    const content = await response.body()
    expect(Buffer.from(content).subarray(0, 8).toString("hex")).toBe("89504e470d0a1a0a")
  }
})

test("browser theme-color and toggle stay aligned across dark and light appearance", async ({ page }) => {
  const html = page.locator("html")
  const meta = page.locator('meta[name="theme-color"]')
  await page.emulateMedia({ colorScheme: "dark" })
  await page.goto(ROOT)

  await expect(html).toHaveClass(/dark/)
  await expect(meta).toHaveAttribute("content", "#171717")
  await page.getByRole("button", { name: "Chuyển sang giao diện sáng" }).click()
  await expect(html).toHaveClass(/light/)
  await expect(meta).toHaveAttribute("content", "#FFFFFF")
  await page.reload()
  await expect(meta).toHaveAttribute("content", "#FFFFFF")

  await page.getByRole("button", { name: "Chuyển sang giao diện tối" }).click()
  await expect(html).toHaveClass(/dark/)
  await expect(meta).toHaveAttribute("content", "#171717")
})

test("system appearance changes update the document and header without a reload", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "light" })
  await page.goto(ROOT)
  const meta = page.locator('meta[name="theme-color"]')
  await expect(meta).toHaveAttribute("content", "#FFFFFF")
  await page.emulateMedia({ colorScheme: "dark" })
  await expect(meta).toHaveAttribute("content", "#171717")
  await expect(page.getByRole("button", { name: "Chuyển sang giao diện sáng" })).toBeVisible()
})
