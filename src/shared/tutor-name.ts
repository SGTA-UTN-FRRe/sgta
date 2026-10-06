export type TutorNameParts = {
  firstName: string | null | undefined;
  lastName?: string | null;
  preferredDisplayName?: string | null;
};

export type TutorNameStyle = "formal" | "informal";

function cleanNamePart(value: string | null | undefined): string | null {
  if (value === null || value === undefined) {
    return null;
  }

  const cleaned = value.normalize("NFKC").trim().replace(/\s+/g, " ");
  return cleaned.length === 0 ? null : cleaned;
}

export function formatTutorName(
  tutor: TutorNameParts,
  style: TutorNameStyle = "formal",
): string {
  const firstName = cleanNamePart(tutor.firstName);

  if (style === "informal") {
    return cleanNamePart(tutor.preferredDisplayName) ?? firstName ?? "";
  }

  const lastName = cleanNamePart(tutor.lastName);
  return [lastName, firstName]
    .filter((part): part is string => part !== null)
    .join(", ");
}

export function getTutorNameAliases(tutor: TutorNameParts): string[] {
  const firstName = cleanNamePart(tutor.firstName);
  const lastName = cleanNamePart(tutor.lastName);
  const fullName = [firstName, lastName]
    .filter((part): part is string => part !== null)
    .join(" ");
  const aliases = [
    cleanNamePart(tutor.preferredDisplayName),
    fullName.length > 0 ? fullName : null,
    formatTutorName(tutor, "formal"),
  ];

  return [...new Set(aliases.filter((alias): alias is string => alias !== null))];
}
