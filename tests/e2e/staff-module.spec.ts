import { test, expect } from "@playwright/test"

const email = process.env.STAFF_TEST_EMAIL || "test@qccgh.com"
const password = process.env.STAFF_TEST_PASSWORD || "password"
const expectAdmin = process.env.STAFF_TEST_EXPECT_ADMIN === "true"

async function login(page) {
  await page.goto("/auth/login")
  await page.getByLabel("Staff Number or Email Address").fill(email)
  await page.getByLabel("Password").fill(password)
  await page.getByRole("button", { name: "Sign In" }).click()
  await page.waitForURL("**/dashboard", { timeout: 30_000 })
}

test("staff module navigation", async ({ page }) => {
  await login(page)

  await page.goto("/dashboard/staff")
  if (expectAdmin) {
    await expect(page.getByRole("heading", { name: "Staff Management" })).toBeVisible()
  } else {
    await page.waitForURL("**/dashboard")
  }

  await page.goto("/dashboard/staff-activation")
  if (expectAdmin) {
    await expect(page.getByRole("heading", { name: "Staff Activation" })).toBeVisible()
  } else {
    await page.waitForURL("**/dashboard")
  }

  await page.goto("/dashboard/user-approvals")
  if (expectAdmin) {
    await expect(page.getByRole("heading", { name: "User Approvals" })).toBeVisible()
  } else {
    await page.waitForURL("**/dashboard")
  }
})

test("staff activation API requires auth", async ({ request }) => {
  const response = await request.get("/api/admin/staff-activation")
  expect([401, 403]).toContain(response.status())
})
