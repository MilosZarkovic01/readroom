import { execSync } from "node:child_process";
import { expect, test } from "vitest";

const shell = process.platform === "win32" ? "cmd.exe" : "/bin/sh";

test("validates the local SQLite Prisma schema", () => {
  const output = execSync("npx prisma validate --schema=prisma/schema.prisma", {
    encoding: "utf8",
    shell,
  });
  expect(output).toMatch(/is valid/i);
});

test("validates the production Postgres Prisma schema", () => {
  const output = execSync("npx prisma validate --schema=prisma/prod/schema.prisma", {
    encoding: "utf8",
    shell,
    env: {
      ...process.env,
      DATABASE_URL: process.env.DATABASE_URL || "postgresql://ci:ci@localhost:5432/ci",
      DATABASE_URL_UNPOOLED:
        process.env.DATABASE_URL_UNPOOLED || "postgresql://ci:ci@localhost:5432/ci",
    },
  });
  expect(output).toMatch(/is valid/i);
});
