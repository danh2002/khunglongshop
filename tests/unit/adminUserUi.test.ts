import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();

function read(relativePath: string) {
  return readFileSync(path.join(root, relativePath), "utf8");
}

describe("admin user UI regression", () => {
  it("uses a custom confirmation dialog instead of window.confirm", () => {
    const source = read("components/admin/UserDeleteActions.tsx");

    expect(source).toContain('role="dialog"');
    expect(source).toContain('aria-modal="true"');
    expect(source).not.toContain("window.confirm");
  });

  it("keeps role, status, and page filters in URL search params", () => {
    const source = read("app/(dashboard)/admin/users/page.tsx");

    expect(source).toContain('params.set("page"');
    expect(source).toContain("role:");
    expect(source).toContain("status:");
    expect(source).toContain("300");
  });

  it("contains no mojibake markers in the user management UI", () => {
    const sources = [
      "app/(dashboard)/admin/users/page.tsx",
      "app/(dashboard)/admin/users/new/page.tsx",
      "app/(dashboard)/admin/users/[id]/page.tsx",
      "components/admin/UserForm.tsx",
      "components/admin/UserDeleteActions.tsx",
    ].map(read);

    expect(sources.join("\n")).not.toMatch(/Ã|Â/);
  });
});
