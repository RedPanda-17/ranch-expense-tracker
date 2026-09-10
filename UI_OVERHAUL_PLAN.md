# Ranch Expense Tracker — Premium UI Overhaul

This branch modernizes the existing employee experience without replacing Supabase, authentication, report/expense business rules, PDF/CSV generation, offline behavior, or receipt storage logic.

## Guardrails
- Keep Version 2.1.2 behavior as the business-rule source of truth.
- Treat existing global functions and DOM IDs as compatibility contracts.
- Add presentation enhancements as isolated CSS/JS layers before changing core logic.
- Preserve keyboard access, focus visibility, reduced-motion support, and mobile usability.
- Validate existing employee workflows before promotion.

## Work order
1. Shared design tokens and motion foundation
2. App shell / responsive navigation
3. Employee dashboard hierarchy
4. Add Expense side-sheet / mobile bottom-sheet experience
5. Expense and report detail scanning
6. Receipt upload/viewer polish
7. Empty/loading/error/success states
8. Responsive and accessibility pass
9. Regression validation
