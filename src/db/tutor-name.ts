import { sql, type SQL, type SQLWrapper } from "drizzle-orm";

export function formatFormalTutorNameSql(
  lastName: SQLWrapper,
  firstName: SQLWrapper,
): SQL<string> {
  return sql<string>`concat_ws(', ', nullif(trim(${lastName}), ''), nullif(trim(${firstName}), ''))`;
}

export function formatInformalTutorNameSql(
  preferredDisplayName: SQLWrapper,
  firstName: SQLWrapper,
): SQL<string> {
  return sql<string>`coalesce(nullif(trim(${preferredDisplayName}), ''), nullif(trim(${firstName}), ''))`;
}
