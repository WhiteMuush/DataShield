import { test, expect, type Page } from "@playwright/test"

const cspViolations: string[] = []

function watchConsole(page: Page) {
  page.on("console", (msg) => {
    const text = msg.text()
    if (text.includes("Content Security Policy") || text.includes("Refused to")) {
      cspViolations.push(text)
    }
  })
}

test("admin signs in, sees dashboard and alerts", async ({ page }) => {
  watchConsole(page)

  await page.goto("/login")
  await page.getByLabel("Email").fill("admin@datashield.local")
  await page.getByLabel("Password").fill("ChangeMe123!")
  await page.getByRole("button", { name: "Sign in" }).click()

  await page.waitForURL("**/dashboard")
  await expect(page.getByRole("main")).toBeVisible()

  await page.goto("/alerts")
  await expect(page.getByRole("main")).toBeVisible()

  expect(cspViolations).toEqual([])
})
