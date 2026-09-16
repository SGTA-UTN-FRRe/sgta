# Golden Screen fixtures

This folder contains the view-only, synthetic data used to calibrate SGTA's
Golden Screens.

The fixture types describe the visual props required by each screen. They are
not a second domain model, persistence layer, or source of business rules.
When live features replace these fixtures, the visual contract should remain
stable while the data adapter changes at the route or feature boundary.

`goldenScreenStateFixtures` keeps the reachable loading, empty, search-empty,
error, required-action, degraded, conflict, and permission-denied copies
separate from populated rows. Screens can select a state by composition or
test props without waiting for a request or depending on the local clock.
