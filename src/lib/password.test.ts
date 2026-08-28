import { describe, expect, it } from "vitest";

import { isValidPassword } from "./password";

describe("isValidPassword", () => {
  it("accepts passwords from eight characters without a maximum", () => {
    expect(isValidPassword("Segura18")).toBe(true);
    expect(isValidPassword(`Segura18${"x".repeat(200)}`)).toBe(true);
  });

  it("requires length, upper and lower case, and a number", () => {
    expect(isValidPassword("Corta1a")).toBe(false);
    expect(isValidPassword("SINMINUSCULAS1")).toBe(false);
    expect(isValidPassword("sinmayusculas1")).toBe(false);
    expect(isValidPassword("SinNumeros")).toBe(false);
  });
});
