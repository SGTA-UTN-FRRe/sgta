import { describe, expect, it } from "vitest";
import { CAREER_COLORS, getLeastUsedCareerColor } from "./career-color";

describe("career palette allocation", () => {
  it("uses palette order for ties and fills unused colors first", () => {
    expect(getLeastUsedCareerColor([])).toBe("BLUE");
    expect(getLeastUsedCareerColor(["BLUE", "BLUE", "VIOLET"])).toBe("EMERALD");
    expect(getLeastUsedCareerColor([...CAREER_COLORS, "BLUE"])).toBe("EMERALD");
    expect(getLeastUsedCareerColor([...CAREER_COLORS])).toBe("BLUE");
  });
});
