import type { Page } from "@playwright/test";

async function signInWithCredentials(
  page: Page,
  email: string,
  password: string,
): Promise<void> {
  await page.goto("/login");

  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);

  await page
    .getByRole("button", {
      name: "Sign in",
    })
    .click();

  await page.waitForURL("**/tasks");
}

export async function signInForE2E(page: Page): Promise<void> {
  const email = process.env.SEED_USER_EMAIL;
  const password = process.env.SEED_USER_PASSWORD;

  if (!email || !password) {
    throw new Error(
      "SEED_USER_EMAIL and SEED_USER_PASSWORD are required for E2E.",
    );
  }

  await signInWithCredentials(page, email, password);
}

export async function signInAsSecondUserForE2E(page: Page): Promise<void> {
  const email = process.env.SEED_SECOND_USER_EMAIL;

  const password = process.env.SEED_SECOND_USER_PASSWORD;

  if (!email || !password) {
    throw new Error(
      "SEED_SECOND_USER_EMAIL and SEED_SECOND_USER_PASSWORD are required for E2E.",
    );
  }

  await signInWithCredentials(page, email, password);
}
