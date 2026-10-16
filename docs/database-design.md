# Database design

The MVP has no database, and deliberately so:

- Conversion is a pure function of user input; nothing needs storing.
- No accounts, history, or analytics exist, so there is nothing to persist.
- Adding a database would create hosting cost, privacy surface, and compliance
  burden with zero product benefit.

If server-side features (e.g. usage analytics, saved documents) are ever added,
they must be designed then — not speculatively now.
