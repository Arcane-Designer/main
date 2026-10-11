# Quick Math history preservation

Every release must retain existing practice history and the existing Sync connection.

## Authorization

Nathan's requests to fix, improve, or update his personal Quick Math game authorize implementation, testing, pushing, and deployment to arcanedesigner.com/math. Complete the requested work without asking for approval for each push. This standing authorization is specific to Quick Math; keep client projects and other consequential actions under their own approval rules. Ask only when a step materially changes the requested scope, involves spending, deletes personal history, or changes account access.

## Release requirements

- Keep the `qm1:` storage namespace and the `quickmath` IndexedDB database. Change the schema only with an additive, tested migration.
- Keep history independent of streaks and Stats filters. Include attempted answers, interrupted sessions, and legacy practice dates.
- Merge restored and received records by identity. Preserve pending writes and acknowledge only records saved durably.
- Keep the existing Sync key during updates. Do not silently generate a new space when a previous connection can be recovered.
- Preserve the `quickmath_connection` cookie and the `quickmath-connection` database. A deliberate Turn off must remain off.
- Keep the Sync connection in private backups; never commit personal backups, practice records, or Sync keys to the public repository.
- Home-screen apps have separate storage from Safari. New installation recovery depends on a surviving browser connection or backup. Do not claim removal is lossless without testing that path.
- Do not recommend deleting or reinstalling the app to apply an ordinary code or icon update. If reinstalling is necessary, verify a cloud copy or exported backup first and establish the same connection in Safari before adding the app.
- Before publishing, test an update with existing data and Sync enabled, a fresh storage context with an inherited cookie, deliberate Sync off, offline practice and retry, repeated backup imports, and older practice outside a streak.
- Update the service-worker cache version for a release. Limit cache cleanup to Quick Math asset caches; never clear localStorage or IndexedDB during deployment.
