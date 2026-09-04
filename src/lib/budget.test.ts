import { describe, expect, it } from "vitest";
import { computeBudgetFit } from "./budget";

describe("computeBudgetFit", () => {
  it("reports a fit with the correct headroom when usage is under budget", () => {
    const result = computeBudgetFit(1000, 8000, 500, 500);
    expect(result.availableTokens).toBe(7000);
    expect(result.fits).toBe(true);
    expect(result.headroomTokens).toBe(6000);
    expect(result.overrunTokens).toBe(0);
  });

  it("reports an overrun with the correct amount when usage exceeds budget", () => {
    const result = computeBudgetFit(9000, 8000, 500, 500);
    expect(result.fits).toBe(false);
    expect(result.headroomTokens).toBe(0);
    expect(result.overrunTokens).toBe(2000);
  });

  it("treats exactly-at-budget usage as fitting", () => {
    const result = computeBudgetFit(7000, 8000, 500, 500);
    expect(result.fits).toBe(true);
    expect(result.headroomTokens).toBe(0);
  });

  it("clamps negative reserved values to zero instead of inflating the available budget", () => {
    const result = computeBudgetFit(1000, 8000, -500, -500);
    expect(result.availableTokens).toBe(8000);
  });

  it("never reports negative available tokens when reservations exceed the window", () => {
    const result = computeBudgetFit(10, 1000, 800, 800);
    expect(result.availableTokens).toBe(0);
    expect(result.fits).toBe(false);
    expect(result.overrunTokens).toBe(10);
  });
});
