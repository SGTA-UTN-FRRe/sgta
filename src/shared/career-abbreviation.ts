const STOP_WORDS = new Set(["de", "del", "la", "las", "el", "los", "en", "y", "e"]);

export function getCareerAbbreviation(name: string): string {
  const words = name.match(/\p{L}+/gu) ?? [];

  return words
    .filter((word) => {
      const normalized = word
        .normalize("NFD")
        .replace(/\p{M}/gu, "")
        .toLocaleLowerCase("es-AR");

      return !STOP_WORDS.has(normalized);
    })
    .slice(0, 4)
    .map((word) => [...word][0].toLocaleUpperCase("es-AR"))
    .join("");
}
