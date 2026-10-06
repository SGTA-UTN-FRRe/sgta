import { describe, expect, it } from "vitest";

import { formatTutorName, getTutorNameAliases } from "./tutor-name";

describe("tutor name formatting", () => {
  it("formats formal names from the parts that are available", () => {
    expect(formatTutorName({ firstName: " Ada ", lastName: "Lovelace" })).toBe(
      "Lovelace, Ada",
    );
    expect(formatTutorName({ firstName: "Ada", lastName: null })).toBe("Ada");
  });

  it("uses a preferred name for informal displays and the first name as fallback", () => {
    expect(
      formatTutorName(
        {
          firstName: "Ada",
          lastName: null,
          preferredDisplayName: " Ada (IEM) ",
        },
        "informal",
      ),
    ).toBe("Ada (IEM)");
    expect(
      formatTutorName({ firstName: "Ada", lastName: "Lovelace" }, "informal"),
    ).toBe("Ada");
  });

  it("builds resolver aliases without empty surnames or dangling separators", () => {
    expect(
      getTutorNameAliases({
        firstName: "Ada",
        lastName: null,
        preferredDisplayName: null,
      }),
    ).toEqual(["Ada"]);
  });
});
