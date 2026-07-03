import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

const sourceRoots = ["app", "lib"];

function listSourceFiles(directory: string): string[] {
  return readdirSync(directory).flatMap((entry) => {
    const fullPath = join(directory, entry);
    const stat = statSync(fullPath);

    if (stat.isDirectory()) return listSourceFiles(fullPath);
    return /\.(ts|tsx)$/.test(entry) ? [fullPath] : [];
  });
}

describe("TiDB transaction compatibility", () => {
  it("does not use Prisma Serializable isolation in runtime source", () => {
    const offenders = sourceRoots
      .flatMap(listSourceFiles)
      .filter((file) =>
        readFileSync(file, "utf8").includes("Prisma.TransactionIsolationLevel.Serializable")
      )
      .map((file) => relative(process.cwd(), file));

    expect(offenders).toEqual([]);
  });
});
