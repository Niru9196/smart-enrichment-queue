# Frontend Agent Rules

You are implementing a maintainable, accessible frontend for Smart Enrichment Queue.

## Stack

- React, strict TypeScript, Vite, Tailwind CSS, shadcn/ui.
- Server state: TanStack Query. Forms: React Hook Form + Zod.
- Tests: Vitest, React Testing Library, Playwright. Follow existing repository tooling.

## Before editing

1. Read this file, package scripts, existing components/styles, routes, API client, and tests.
2. Follow established patterns and make the smallest complete change.
3. Do not invent API behavior, fabricate data, or claim an integration exists when it does not.

## Architecture

- Keep pages, feature components, shared UI, hooks, schemas, and API access responsibilities clear.
- Use one shared typed API client; do not scatter ad hoc fetch calls through components.
- Use TanStack Query for server state. Avoid duplicate server data in useState or global context.
- Keep components focused; extract complex logic when it improves reuse, readability, or testability.
- Avoid unnecessary abstractions, dependencies, unrelated refactors, and giant components.

## React and TypeScript

- Use strict typing. Avoid `any`, unjustified casts, `@ts-ignore`, and non-null assertions.
- Use stable IDs as list keys when records can reorder or change.
- Derive values instead of mirroring them in state. Use effects to synchronize external systems, not as a default state-management tool.
- Do not mutate props, state, or query results.
- Use memoization only when justified by correctness or measured performance.
- Clean up subscriptions, listeners, and asynchronous work when appropriate.

## API and forms

- Treat HTTP responses as runtime data; TypeScript types alone do not validate JSON.
- Use stable query keys, explicit loading/error states, and targeted cache invalidation after mutations.
- Never show mutation success before the server confirms it.
- Validate non-trivial forms with React Hook Form + Zod. Backend validation remains authoritative.
- Associate labels, hints, and errors with inputs. Preserve values after recoverable failures.
- Debounce search when useful and handle stale responses/cancellation appropriately.
- Never hardcode production API URLs. Use documented environment configuration.

## User Experience Engineering

### Think before implementing

- Understand the user goal and primary task before changing the UI.
- Prefer the simplest interface that solves the problem.
- Do not add features, animations, or components without a clear user benefit.
- Preserve existing architecture and design patterns unless there is a concrete reason to change them.

### Design for real workflows

- Optimize for the complete workflow, not isolated screens: profile, ranked list, queue, enrich.
- Make the primary action obvious on every page.
- Reduce unnecessary clicks, repeated data entry, and context switching.
- Use familiar interaction patterns for tables, filters, forms, dialogs, and navigation.

### Handle every UI state

Every data-driven screen must consider loading, empty, populated, no search results, validation errors, API errors, disabled or pending actions, and successful completion. Provide clear recovery actions when something fails.

### Visual consistency

- Use existing design tokens and shared components.
- Use consistent spacing, typography, border radius, colors, and icon sizing.
- Avoid arbitrary colors, excessive shadows, gradients, and decorative elements.
- Do not use color alone to communicate status.
- Keep important data readable and scannable.

### Accessibility is required

- Prefer semantic HTML and native controls.
- Give every input a programmatic label.
- Support keyboard navigation and visible focus.
- Ensure dialogs manage focus correctly.
- Use accessible names for icon-only buttons.
- Respect reduced-motion preferences.
- Check contrast and screen-reader announcements.

### Make interactions predictable

- Show progress for operations that take noticeable time.
- Prevent accidental duplicate submissions.
- Disable actions only when the reason is clear.
- Confirm destructive or costly actions.
- Provide useful success and error feedback.
- Do not display success messages before an operation actually succeeds.

### Build responsive interfaces

- Test narrow mobile, tablet, and desktop widths.
- Avoid horizontal overflow.
- Make tables usable on small screens through appropriate adaptation.
- Keep important actions available at all supported sizes.

### Protect user trust

- Explain scores and recommendations with real data.
- Distinguish unknown values from zero values.
- Never fabricate metrics, enrichment results, or verification statuses.
- Explain estimated costs and simulated operations accurately.
- Avoid misleading loading indicators and fake progress.

### Verify before finishing

- Run linting, type checks, and relevant tests.
- Test the primary workflow in a browser when browser tooling is available.
- Check keyboard operation, error handling, and responsive behavior.
- Fix regressions rather than hiding them with visual workarounds.
- Report what was tested and what remains unverified.

A UI change is complete when it is functional, consistent, accessible, responsive, handles realistic failure states, and supports the intended user workflow.

## Smart Enrichment Queue

- Show score, priority, confidence, and evidence as distinct concepts; score is not conversion probability.
- Render explanations from backend scoring results; never invent frontend-only reasons.
- Distinguish disqualified, needs_review, and low-scoring leads. Missing data is not a confirmed mismatch.
- Clearly label simulated enrichment and demo credit estimates. Never claim real-provider success or actual savings.
- Make selection counts, already-queued state, pending actions, and export failures clear.
- Preserve backend sorting/pagination semantics; do not rank only the visible page if global ranking is promised.

## Security and performance

- Never put secrets or privileged tokens in frontend code or `VITE_` variables; these are public to the client.
- Client-side guards are not authorization; the backend must enforce access.
- Avoid `dangerouslySetInnerHTML`; sanitize untrusted rich HTML if it is genuinely required.
- Keep lists bounded and use server pagination. Add virtualization or code splitting only when justified.
- Avoid logging sensitive company/contact data in the browser console.
- Do not store sensitive data in local storage without explicit review.

## Tests and completion

- Test behavior with Vitest, React Testing Library, and Playwright according to the repository setup.
- Cover loading/empty/error states, form validation, mutation failures, keyboard access, and the primary end-to-end flow.
- Do not weaken tests to hide a regression.
- Run relevant tests, lint, type-check, and production build when available. Never claim checks passed unless they ran successfully.
- Update relevant docs and environment examples.
- Finish with summary, interaction/accessibility decisions, exact checks/results, limitations, and follow-ups.
- Do not leave fake success paths, debugging code, unexplained TODOs, or unrelated changes.
