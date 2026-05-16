import { expect, type Page } from "@playwright/test";

const ignoredConsoleErrorPatterns = [
  /favicon\.ico/i,
  /\/_next\/webpack-hmr/i,
  /WebSocket connection .*webpack-hmr/i,
];

export function collectClientErrors(page: Page) {
  const errors: string[] = [];

  page.on("pageerror", (error) => {
    errors.push(error.message);
  });

  page.on("console", (message) => {
    const text = message.text();
    if (message.type() === "error" && !ignoredConsoleErrorPatterns.some((pattern) => pattern.test(text))) {
      errors.push(text);
    }
  });

  return errors;
}

export function expectNoClientErrors(errors: string[]) {
  expect(errors, errors.join("\n")).toEqual([]);
}
