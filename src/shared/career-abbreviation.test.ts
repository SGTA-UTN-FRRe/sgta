import { describe, expect, it } from "vitest";

import { getCareerAbbreviation } from "./career-abbreviation";

describe("getCareerAbbreviation", () => {
  it("excludes Spanish connector words regardless of capitalization", () => {
    expect(getCareerAbbreviation("De Del La Las El Los En Y E Ingeniería"))
      .toBe("I");
    expect(getCareerAbbreviation("Ingeniería en Sistemas de Información")).toBe(
      "ISI",
    );
  });

  it("preserves accented initials", () => {
    expect(getCareerAbbreviation("Álgebra y Estadística")).toBe("ÁE");
  });

  it("uses no more than four initials", () => {
    expect(
      getCareerAbbreviation(
        "Universidad Tecnológica Nacional Regional Federal",
      ),
    ).toBe("UTNR");
  });

  it("supports a single-word career name", () => {
    expect(getCareerAbbreviation("Programación")).toBe("P");
  });
});
