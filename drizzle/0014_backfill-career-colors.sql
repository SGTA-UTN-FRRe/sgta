-- Distribute existing careers deterministically in normalized-name order.
WITH ranked AS (
  SELECT id, row_number() OVER (ORDER BY normalized_name, id) - 1 AS position
  FROM career
), palette AS (
  SELECT enum_range(NULL::career_color) AS colors
)
UPDATE career
SET color = palette.colors[(ranked.position % array_length(palette.colors, 1) + 1)::integer]
FROM ranked, palette
WHERE career.id = ranked.id;
