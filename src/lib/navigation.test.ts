import { describe, expect, it } from "vitest";

import { safeNextPath } from "./navigation";

describe("safeNextPath", () => {
  it("accepts local application paths", () => {
    expect(safeNextPath("/onboarding")).toBe("/onboarding");
    expect(safeNextPath("/invitations?source=email")).toBe(
      "/invitations?source=email",
    );
  });

  it("rejects absolute and protocol-relative redirects", () => {
    expect(safeNextPath("https://example.com")).toBeNull();
    expect(safeNextPath("//example.com/path")).toBeNull();
    expect(safeNextPath("/\\example.com/path")).toBeNull();
    expect(safeNextPath("/path\nSet-Cookie: unsafe=true")).toBeNull();
    expect(safeNextPath(null)).toBeNull();
  });
});
