import { expect, test } from "@playwright/test";

import { signInForE2E } from "./support/auth";

test("redirects unauthenticated users to login", async ({ page }) => {
  await page.goto("/tasks");

  await expect(page).toHaveURL(/\/login/);
});

test("signs in with valid credentials", async ({ page }) => {
  await signInForE2E(page);

  await expect(page).toHaveURL(/\/tasks/);
});

test("rejects invalid credentials", async ({ page }) => {
  const email = process.env.SEED_USER_EMAIL;

  if (!email) {
    throw new Error("SEED_USER_EMAIL is required for E2E.");
  }

  await page.goto("/login");

  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill("incorrect-password");

  await page
    .getByRole("button", {
      name: "Sign in",
    })
    .click();

  await expect(
    page.getByText("Invalid email or password.", {
      exact: true,
    }),
  ).toBeVisible();
});

test("signs out", async ({ page }) => {
  await signInForE2E(page);

  await page
    .getByRole("button", {
      name: "Sign out",
    })
    .click();

  await expect(page).toHaveURL(/\/login/);

  await page.goto("/tasks");

  await expect(page).toHaveURL(/\/login/);
});
