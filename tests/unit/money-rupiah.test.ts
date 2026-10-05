import { describe, expect, it } from "vitest";

import { assertAmount, formatRupiah, isValidAmount, parseRupiah } from "@/lib/money";

describe("formatRupiah", () => {
  it.each([
    [0, "Rp 0"],
    [500, "Rp 500"],
    [1_000, "Rp 1.000"],
    [35_000, "Rp 35.000"],
    [1_250_000, "Rp 1.250.000"],
    [1_000_000_000_000, "Rp 1.000.000.000.000"],
  ])("%d -> %s", (amount, expected) => {
    expect(formatRupiah(amount)).toBe(expected);
  });

  it("menaruh tanda minus di depan Rp", () => {
    expect(formatRupiah(-35_000)).toBe("-Rp 35.000");
  });

  it("menolak nominal desimal, bukan angka, dan di luar batas aman", () => {
    for (const bad of [1.5, 0.1 + 0.2, Number.NaN, Infinity, Number.MAX_SAFE_INTEGER + 1]) {
      expect(() => formatRupiah(bad)).toThrow(RangeError);
    }
  });
});

describe("parseRupiah", () => {
  it.each([
    ["1250000", 1_250_000],
    ["1.250.000", 1_250_000],
    ["Rp 1.250.000", 1_250_000],
    ["rp1.250.000", 1_250_000],
    ["Rp. 35.000", 35_000],
    ["  35000  ", 35_000],
    ["-35.000", -35_000],
    ["-Rp 35.000", -35_000],
    ["0", 0],
    ["-0", 0],
  ])("%j -> %d", (input, expected) => {
    expect(parseRupiah(input)).toBe(expected);
  });

  it.each(["", "   ", "Rp", "abc", "1,5", "1.5", "12.50", "1.25.000", "1.2500", "35rb", "--5", "9007199254740993"])(
    "menolak %j",
    (input) => {
      expect(parseRupiah(input)).toBeNull();
    },
  );

  it("bolak-balik dengan formatRupiah", () => {
    for (const n of [0, 7, 999, 1_000, 123_456_789, -42_000]) {
      expect(parseRupiah(formatRupiah(n))).toBe(n);
    }
  });
});

describe("isValidAmount / assertAmount", () => {
  it("hanya menerima bilangan bulat yang aman", () => {
    expect(isValidAmount(100)).toBe(true);
    expect(isValidAmount(-100)).toBe(true);
    expect(isValidAmount(1.5)).toBe(false);
    expect(isValidAmount("100")).toBe(false);
    expect(assertAmount(100)).toBe(100);
    expect(() => assertAmount(0.5)).toThrow(RangeError);
  });
});
