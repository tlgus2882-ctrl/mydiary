import { describe, expect, it } from "vitest";
import { FONTS } from "@/lib/fonts";

describe("font scale", () => {
  it("gives every font a positive scale", () => {
    for (const f of FONTS) expect(f.scale).toBeGreaterThan(0);
  });
  it("enlarges the small handwriting fonts", () => {
    for (const id of ["nanum-pen-script", "hi-melody", "gamja-flower", "poor-story"]) {
      expect(FONTS.find((f) => f.id === id)!.scale).toBeGreaterThan(1);
    }
  });
});
