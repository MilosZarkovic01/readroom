import { expect, test } from "vitest";
import { oauthErrorMessage } from "../../src/lib/oauth-errors";

test("explains cancelled Google sign-in", () => {
  expect(oauthErrorMessage("AccessDenied")).toMatch(/cancelled/i);
});

test("ignores empty codes", () => {
  expect(oauthErrorMessage()).toBeUndefined();
});
