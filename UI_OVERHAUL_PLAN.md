# Ranch Expense Tracker — Premium UI Overhaul

This branch modernizes the existing employee experience without replacing Supabase, authentication, report/expense business rules, PDF/CSV generation, offline behavior, or receipt storage logic.

## Guardrails
- Keep Version 2.1.2 behavior as the business-rule source of truth.
- Treat existing global functions and DOM IDs as compatibility contracts.
- Add presentation enhancements as isolated CSS/JS layers before changing core logic.
- Preserve keyboard access, focus visibility, reduced-motion support, and mobile usability.
- Validate existing employee workflows before promotion.

## Work order
1. Shared design tokens and motion foundation — implemented
2. App shell / responsive navigation — implemented
3. Employee dashboard hierarchy — implemented
4. Add Expense side-sheet / mobile bottom-sheet experience — implemented
5. Expense and report detail scanning — implemented
6. Receipt upload/viewer polish — implemented
7. Empty/loading/error/success states — implemented
8. Responsive and accessibility pass — implemented
9. Regression validation — in progress
