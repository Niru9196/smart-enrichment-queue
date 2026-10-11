# API Engineering Rules — Senior Developer Standards

Stack: Node.js, Express, strict TypeScript, PostgreSQL, Prisma, Zod.
Tests: Vitest and Supertest. Use installed versions; do not upgrade dependencies without a reason.

Follow the root `AGENTS.md` and these API-specific instructions.

## 1. Core Principles

- Write code that is correct, secure, maintainable, testable, and easy to understand.
- Prefer simple, explicit solutions over clever abstractions.
- Follow existing project conventions before introducing new patterns.
- Make the smallest coherent change that solves the problem.
- Avoid premature optimization, unnecessary dependencies, and overengineering.
- Never silently ignore errors, return fake success responses, or hide unfinished work.
- Never claim a test, build, migration, or deployment succeeded unless you verified it.

## 2. Inspect Before Coding

Before making changes:

- Read the relevant source files, `package.json`, TypeScript configuration, environment configuration, Prisma schema, migrations, and tests.
- Understand existing API contracts and their frontend consumers.
- Reuse existing utilities, middleware, schemas, and dependencies.
- Identify possible side effects before changing shared code.
- Do not overwrite unrelated changes or perform unnecessary refactoring.
- Ask for clarification or document assumptions when requirements affect security, data integrity, or public API behavior.

## 3. TypeScript Standards

- Use strict TypeScript.
- Never use `any` when a safer type is possible.
- Use `unknown` for untrusted values and narrow the type through validation.
- Avoid unjustified type assertions, non-null assertions, `@ts-ignore`, and compiler suppression.
- Use explicit types for public interfaces and important service boundaries.
- Allow TypeScript to infer obvious local types.
- Prefer discriminated unions for state machines and complex result types.
- Keep types consistent with runtime validation schemas.
- Do not expose Prisma model types directly as public API contracts.
- Avoid duplicated types, circular dependencies, and unnecessary abstractions.
- Follow the project's configured module system and import conventions.
- Give exported and important service/domain functions explicit return types.
- Name functions and variables after what they do.

## 4. API Design

- Use consistent, resource-oriented routes under `/api/v1`.
- Use HTTP methods according to their semantics:
  - `GET`: read data without mutating state.
  - `POST`: create resources or perform explicit actions.
  - `PUT`: replace a resource or perform a documented full update.
  - `PATCH`: partially update a resource.
  - `DELETE`: remove a resource or association.
- Return appropriate HTTP status codes. Never return success status codes for failed operations.
- Keep response shapes, naming, pagination, and error formats consistent.
- Do not expose database internals, stack traces, credentials, or implementation details.
- Make breaking changes explicit and update all affected consumers and tests.

## 5. Request Validation

- Treat request bodies, query parameters, path parameters, headers, and external responses as untrusted.
- Validate all external input at the API boundary with Zod.
- TypeScript types do not validate runtime input.
- Validate IDs, string lengths, number ranges, enums, dates, arrays, nested objects, and cross-field constraints.
- Parse query-string numbers and booleans explicitly.
- Cap page sizes, request body sizes, and array lengths.
- Whitelist sortable fields, filterable fields, and updateable properties.
- Never pass arbitrary client input into SQL fragments or database field names.
- Prevent mass assignment by explicitly selecting permitted update fields.
- Return useful validation errors without exposing secrets or echoing sensitive request data.
- Validate environment variables at startup. Reject invalid configuration rather than silently using insecure defaults.

## 6. Architecture and Separation of Concerns

- **Routes:** Define endpoints, middleware, and handlers.
- **Middleware:** Cross-cutting concerns such as request IDs, demo identity, and rate limiting.
- **Controllers:** Translate HTTP requests into service calls and map results to responses.
- **Schemas:** Validate input and define contracts.
- **Services:** Implement business rules, application workflows, and transaction boundaries.
- **Domain:** Pure scoring and queue-transition rules, independent of HTTP and Prisma.
- **Views:** Format responses that need transformation (CSV). JSON uses service DTOs.
- **Infrastructure:** Prisma, logging, and environment configuration.

Rules:

- Keep controllers thin. Never put core business logic in Express route handlers.
- Do not import Express request or response objects into domain or service logic (CSV send helpers in `views/` are the exception).
- Keep scoring and qualification logic independent of HTTP and database frameworks.
- Reuse a single configured Prisma client.
- Avoid circular dependencies.
- Do not create interfaces, repositories, factories, or base classes without a genuine need.
- Keep dependencies flowing: routes → controllers → services → domain / Prisma.

## 7. Error Handling

- Use the centralized Express error handler.
- Express 5 forwards rejected async handlers; do not wrap every route in try/catch.
- Distinguish expected `AppError`s from unexpected internal failures.
- Use stable machine-readable error codes.
- Map known Prisma errors to HTTP responses.
- Never expose raw internal error messages or stack traces to API clients.
- Do not swallow exceptions or return placeholder success values.
- Preserve original errors as `cause` when wrapping them.
- Log unexpected 5xx failures once, in the error handler.
- Return `{ "error": { "code", "message", "requestId", "details?" } }`.
- Keep public error messages safe and understandable.

## 8. Database and Prisma

- Use one Prisma client instance for the application lifecycle.
- Make production schema changes through reviewed migrations. Never rewrite an applied migration.
- Do not use `prisma db push` as the production migration strategy.
- Use database constraints for important invariants, including foreign keys and uniqueness.
- Use short transactions when multiple writes must succeed or fail together. Never call external services inside a transaction.
- Handle unique-constraint and foreign-key errors deliberately.
- Avoid N+1 queries. Fetch only the columns and relations required.
- Ranking scores a bounded filtered set in-process (`MAX_RANKED_COMPANIES`); beyond that, return 422.
- Represent unknown values with `null`, not invented defaults.
- Use UTC timestamps. Use decimal-safe representations for money (`BigInt` for revenue).
- Never log complete database records or sensitive SQL parameters.
- Run migrations through a controlled deployment step, not automatically on every startup.
- Keep development seed scripts separate from production data.

## 9. Transactions and Concurrency

- Assume requests may execute concurrently.
- Enforce uniqueness and critical constraints in the database.
- Queue items are unique on `(user_id, company_id)`; concurrent adds are duplicate-safe.
- Validate allowed status transitions in the service layer. A valid enum is not a permitted transition.
- Never implement credit deduction as an unsafe read-then-write sequence.
- Enrichment counts come from rows actually updated, so concurrent runs cannot double-report.

## 10. Authentication and Authorization

- This API uses one seeded demo user. There is no authentication.
- Never claim secure multi-user isolation.
- Do not trust a client-provided `userId` as proof of identity.
- Scope reads, updates, deletes, preferences, queue items, and exports to the demo user id attached by middleware.
- A record ID is not authorization; foreign queue items return 404.
- Replace demo identity before storing real customer data.

## 11. Security

- Never commit API keys, database credentials, tokens, or other secrets.
- Keep server secrets in server-only environment variables. Never expose them through `VITE_*`.
- Maintain a safe `.env.example` containing placeholders only.
- Use parameterized Prisma access. Avoid raw SQL unless necessary.
- Configure CORS for `FRONTEND_ORIGIN`. CORS is not authentication.
- Use request-size limits and rate limiting.
- Prevent spreadsheet formula injection in CSV exports (`=`, `+`, `-`, `@`).
- Do not reveal stack traces, internal paths, credentials, or configuration through public responses.

## 12. Logging and Observability

- Use the shared structured logger. Never scatter `console.log` in request paths.
- Include timestamps, severity, useful metadata, and request IDs.
- Never log passwords, tokens, cookies, authorization headers, database URLs, full request bodies, or contact details.
- Prefer identifiers, counts, durations, and error codes over complete records.
- Treat redaction as a safety net, not permission to log arbitrary objects.
- Do not expose stack traces to API clients.
- Keep health endpoints minimal and safe.

## 13. Performance

- Use server-side filtering, sorting, and pagination.
- Enforce maximum page sizes and bounded computations.
- Avoid repeated queries inside loops when batch queries are possible.
- Do not introduce Redis, queues, or background workers without a demonstrated requirement.
- Keep scoring calculations bounded and deterministic.

## 14. Smart Enrichment Queue Business Rules

### Company data

- Never invent company attributes, revenue, employee counts, locations, or contact verification.
- Preserve the distinction between missing data and a known negative value.
- Never claim that scraped data is verified unless verification actually occurred.

### Scoring

- Scoring must be deterministic and independently testable.
- Keep hard requirements separate from weighted preferences.
- Normalize factor matches to `0..1`.
- `score = 100 * sum(weight * match for known factors) / sum(weight for known factors)`.
- Track missing factors and coverage/confidence separately from the score.
- If no meaningful fit factor is known, return a null score and `needs_review`.
- Unknown values must not automatically violate hard requirements.
- Known violations of strict requirements may disqualify a lead, with an evidence-based reason.
- Generate explanations from the same scoring result used to calculate the score.
- Score is a fit heuristic, not conversion probability.
- Rank the filtered candidate set before pagination.
- Do not duplicate the scoring formula in the frontend.

### Queue and enrichment

- Define duplicate queue-addition behavior and enforce it safely.
- Validate allowed status transitions.
- Label estimated credits as estimates.
- Label simulated enrichment as simulated.
- Never claim that real credits were charged or a real provider was called.
- Keep exports consistent with the documented queue state and filters.

## 15. API Contracts

- Keep persistence models separate from public response DTOs.
- Explicitly map database records to response objects.
- Never return unnecessary internal fields (`sourceRecordId`, timestamps on companies).
- Use consistent pagination metadata and deterministic ordering.
- Use ISO 8601 UTC timestamps.
- Missing, `null`, empty strings, and empty arrays are different.
- Use stable error codes that clients can interpret without parsing messages.

## 16. Testing

- Unit-test scoring, qualification, status transitions, CSV escaping, and error mapping.
- Cover normal cases, boundaries, invalid inputs, missing values, and failure paths.
- Integration-test HTTP status codes, validation, error shapes, database constraints, and concurrency.
- Use the isolated test database. Never run destructive cleanup against production data.
- Test duplicate queue additions, ownership of foreign queue items, pagination caps, invalid sort/filter keys, and CSV formula-injection handling.
- Test scoring with all-missing data, partial data, zero weights, strict-rule violations, unknown values, and ties.
- Test observable behavior. Do not weaken tests to hide a regression.

## 17. Startup and Shutdown

- Validate environment variables once during startup. Fail clearly when required configuration is missing.
- In production, do not default `FRONTEND_ORIGIN` to localhost.
- Ping the database before accepting traffic.
- Gracefully stop accepting requests on SIGTERM/SIGINT. Allow in-flight work a bounded period to finish.
- Disconnect Prisma cleanly.
- Do not suppress fatal process errors and continue in an unknown state.

## 18. Documentation and Maintainability

- Keep the README, `.env.example`, and this file accurate.
- Comments should explain why something exists, not repeat the code.
- Remove dead code and unused imports.
- Avoid commented-out implementations and vague TODOs in the primary user journey.

## 19. Required Completion Checklist

Before completing a task, verify:

- [ ] Input is validated at the API boundary.
- [ ] Authorization is enforced where applicable (demo-user scoping today).
- [ ] Business logic is in the appropriate service or domain function.
- [ ] HTTP methods and status codes are correct.
- [ ] Response DTOs do not leak internal fields.
- [ ] Errors use the centralized handling strategy.
- [ ] Sensitive data is not exposed through logs or responses.
- [ ] Database constraints and transactions preserve invariants.
- [ ] Queries are bounded and avoid unnecessary data loading.
- [ ] Duplicate requests and concurrency have been considered.
- [ ] Tests cover the main path, edge cases, and failures.
- [ ] Migrations and environment documentation are updated if needed.
- [ ] Relevant lint, typecheck, test, and build commands have been run.
- [ ] Any failures or skipped checks are reported honestly.

## 20. Required Final Report

At the end of each implementation task, report:

1. **Implemented:** What changed and which important files were affected.
2. **Design decisions:** Significant decisions affecting security, API behavior, or maintainability.
3. **Validation:** Exact commands run and their results.
4. **Database changes:** Migration and seeding implications.
5. **Limitations:** Known gaps and assumptions.
6. **Manual steps:** Any remaining setup required from the developer.

Never claim production readiness solely because the code compiles. Report the level of verification actually completed.
