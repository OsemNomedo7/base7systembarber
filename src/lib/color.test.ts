import { describe, it, expect } from "vitest";
import { hslStringToHex, hexToHslString } from "./color";

describe("hslStringToHex / hexToHslString", () => {
  it("converte preto e branco corretamente", () => {
    expect(hslStringToHex("0 0% 0%")).toBe("#000000");
    expect(hslStringToHex("0 0% 100%")).toBe("#ffffff");
  });

  it("faz ida e volta sem perder a cor (tokens reais do design system)", () => {
    const tokens = ["30 12% 7%", "36 38% 55%", "40 24% 90%", "350 55% 26%"];
    for (const hsl of tokens) {
      const hex = hslStringToHex(hsl);
      const roundTripped = hexToHslString(hex);
      // arredondamento pode variar +-1 em cada componente
      const [h1, s1, l1] = hsl.match(/-?\d+/g)!.map(Number);
      const [h2, s2, l2] = roundTripped.match(/-?\d+/g)!.map(Number);
      // hue tem granularidade mais grosseira na quantização de 8 bits do hex
      expect(Math.abs(h1 - h2)).toBeLessThanOrEqual(2);
      expect(Math.abs(s1 - s2)).toBeLessThanOrEqual(1);
      expect(Math.abs(l1 - l2)).toBeLessThanOrEqual(1);
    }
  });

  it("hexToHslString converte um hex conhecido", () => {
    expect(hexToHslString("#ff0000")).toBe("0 100% 50%");
  });
});
