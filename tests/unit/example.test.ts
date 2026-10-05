import { describe, expect, it } from "vitest";

// Test contoh Fase 0: memastikan Vitest berjalan.
// Test kalkulasi uang yang sebenarnya ditambahkan bersama src/lib/money/ di Fase 2.
describe("setup Vitest", () => {
  it("menjumlahkan nominal integer tanpa float", () => {
    const nominal = [1_250_000, 35_000, 15_500];
    const total = nominal.reduce((a, b) => a + b, 0);
    expect(total).toBe(1_300_500);
    expect(Number.isInteger(total)).toBe(true);
  });
});
