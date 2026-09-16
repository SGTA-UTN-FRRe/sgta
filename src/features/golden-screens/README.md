# Golden Screen fixtures

This folder contains the view-only, synthetic data used to calibrate SGTA's
Golden Screens.

The fixture types describe the visual props required by each screen. They are
not a second domain model, persistence layer, or source of business rules.
When live features replace these fixtures, the visual contract should remain
stable while the data adapter changes at the route or feature boundary.
