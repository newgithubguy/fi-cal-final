# Changelog

## 2026-03-23 (v1.2.0)

### Added
- Added account color customization with 10-color preset palette.
- Added colored indicator dot on account names in the sidebar.
- Added **Manage Payees & Descriptions** modal accessible via the 📝 button.
- Added ability to edit payee entries in the manager.
- Added ability to delete payee entries from history.
- Added ability to edit description entries in the manager.
- Added ability to delete description entries from history.
- Added tab-based navigation between Payees and Descriptions in the manager.
- Added `color` column to accounts table with automatic database migration.

### Changed
- Updated color picker modal with smooth animations and better UX.
- Improved account button layout to include color picker button.

### Fixed
- None

## 2026-03-23 (v1.1.1)

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