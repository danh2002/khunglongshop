import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("Header navigation", () => {
  const source = fs.readFileSync(
    path.join(process.cwd(), "components", "Header.tsx"),
    "utf8",
  );
  const rootLayoutSource = fs.readFileSync(
    path.join(process.cwd(), "app", "layout.tsx"),
    "utf8",
  );
  const accountPageSource = fs.readFileSync(
    path.join(process.cwd(), "app", "(public)", "account", "page.tsx"),
    "utf8",
  );

  it("does not pass Next Link through styled-components' as prop", () => {
    expect(source).not.toMatch(/as=\{[^}]*Link/);
    expect(source).not.toContain("renderCategoryLinks(true)");
    expect(source).not.toContain("renderCharacterLinks(true)");
  });

  it("opens a search form instead of linking the icon directly to /search", () => {
    expect(source).not.toContain('<ActionLink href="/search"');
    expect(source).toContain("setSearchOpen((open) => !open)");
    expect(source).toContain("searchInputRef.current?.focus()");
    expect(source).toContain('new URLSearchParams({ q: query })');
    expect(source).toContain("router.push(`/search?${params.toString()}`)");
    expect(source).toContain('event.key !== "Escape"');
    expect(source).toContain("<MobileSearchForm");
  });

  it("does not force an unauthenticated session while the client session is loading", () => {
    expect(rootLayoutSource).not.toContain("session={null}");
    expect(source).toContain('status === "authenticated"');
    expect(source).toContain('status === "unauthenticated"');
  });

  it("keeps logout redirects on the current origin", () => {
    expect(accountPageSource).toContain('signOut({ callbackUrl: "/", redirect: false })');
    expect(accountPageSource).toContain('window.location.assign("/")');
  });
});
