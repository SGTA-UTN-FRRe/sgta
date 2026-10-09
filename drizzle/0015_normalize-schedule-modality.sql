-- Normalize free-text schedule modality before it becomes an enum.
-- Recognizable virtual values map to VIRTUAL; every other value, including NULL, maps to IN_PERSON.
UPDATE "schedule_assignment"
SET "modality" = CASE
  WHEN lower(coalesce("modality", '')) ~ '(virtual|remot|online|en l[ií]nea|zoom|meet|distancia)' THEN 'VIRTUAL'
  ELSE 'IN_PERSON'
END;
