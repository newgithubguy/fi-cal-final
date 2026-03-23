# Changelog

## 2026-03-23

### Added
- Added an Income / Expense selector to the Add Transaction form.
- Added an Income / Expense selector to the Edit Transaction form.
- Added color-coded transaction type dropdown styling: Expense is red and Income is green.
- Added a repository .gitignore file to exclude node_modules from version control.

### Changed
- Moved the Transactions panel below the Add Transaction panel.
- Refined stacked workspace panel sizing for a cleaner vertical layout.
- Updated the Payee label text to Payee / Description in add and edit transaction forms.
- Updated selected non-today calendar days to use a white background.
- Updated documentation to reflect the current transaction entry workflow and layout.

### Fixed
- Fixed add transaction amount handling so users no longer need to enter negative numbers for expenses.
- Fixed edit transaction amount handling so transaction type controls the stored amount sign.
- Fixed server-side recurrence expansion so one-time transactions are not treated as unknown recurrence types.
- Fixed server-side recurrence handling to support daily recurrence consistently with the UI.