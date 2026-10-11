# Global Agent Instructions

## 1. Before Starting

Before making any changes:

1. Read this file.
2. Check whether the target repository contains its own `AGENTS.md`.
3. Read the repository-specific instructions before modifying files.
4. Understand the task and identify the relevant part of the codebase.
5. Trace the existing flow before deciding where to make a change.
6. Search for existing implementations before creating new ones.

Do not start modifying files before understanding the existing implementation.

---

## 2. Repository Exploration

When working on a task:

* Identify the repository and relevant application/module.
* Search for existing components, utilities, hooks, services, types, and patterns.
* Check relevant documentation and configuration.
* Understand how the affected code is currently being used.
* When fixing a bug, search the callers of the affected function/component/service to understand whether the issue is shared.

Prefer repository evidence over assumptions.

---

## 3. Avoid Over-Engineering

Work like a pragmatic senior developer: efficient, not careless.

The goal is not to write more code. The goal is to solve the actual problem with the smallest correct change.

Before writing new code, apply this order:

1. Do we need to build this at all? Prefer YAGNI.
2. Does it already exist? Reuse the existing helper, utility, component, hook, service, or pattern.
3. Does the standard library solve it? Prefer it over custom code.
4. Does the platform already provide it? Prefer native capabilities.
5. Does an installed dependency already solve it? Reuse it before adding another dependency.
6. Can the solution be simpler? Prefer the smallest clear implementation.
7. Only then write new code.

### Prefer

* Deletion over addition
* Existing patterns over new abstractions
* Small, focused changes
* Boring, readable code over clever code
* The fewest files reasonably necessary
* Existing dependencies over new dependencies
* The simplest correct solution

### Avoid

* Unnecessary abstractions
* Duplicate implementations
* New wrappers or utilities without a concrete need
* New dependencies when existing capabilities are sufficient
* Boilerplate that provides no real value
* Unrelated refactoring
* Architecture changes for small tasks
* Solving hypothetical future problems that do not currently exist

If a complex implementation is being proposed, ask:

> Can the existing code or a simpler approach solve this?

A small diff is valuable only after the problem is properly understood. The smallest change in the wrong place is not an efficient solution.

---

## 4. Bug Fixes: Fix the Root Cause

A bug report usually describes a symptom, not the root cause.

Before patching the reported caller:

1. Trace the actual flow.
2. Identify where the incorrect behavior originates.
3. Search all relevant callers of the affected function/component/service.
4. Determine whether the problem is shared.
5. Fix the root cause at the narrowest correct location.

Prefer one correct shared fix over repeating the same guard or workaround across multiple callers.

Do not patch only the path mentioned in the ticket if the underlying function is responsible for the behavior elsewhere.

---

## 5. Implementation

Follow the existing architecture and conventions.

Prefer:

* Reusing existing code
* Small and focused changes
* Existing abstractions
* Existing dependencies
* Clear naming
* Strong typing
* The minimum code required to correctly solve the problem

Do not introduce abstractions unless they solve a real, demonstrated problem.

Do not add code merely because it might be useful later.

---

## 6. Correctness Is Not Optional

"Minimal" does not mean careless.

Do not simplify away:

* Input validation at trust boundaries
* Security requirements
* Accessibility
* Error handling that prevents data loss
* Important edge cases
* Explicitly requested behavior
* Necessary platform or hardware considerations

When two approaches are similarly small, prefer the one that correctly handles important edge cases.

Lazy means less unnecessary work, not lower correctness.

---

## 7. Verification

Before considering a task complete:

* Review the changes.
* Check the final diff.
* Run relevant tests.
* Run type checking where applicable.
* Run linting where applicable.
* Verify the requested behavior.
* Check for unintended changes.

For non-trivial logic, leave behind at least one practical verification mechanism:

* An existing relevant test
* A small focused test
* A runnable self-check/assertion
* The smallest existing validation command that would catch a regression

Do not create elaborate test infrastructure merely to verify a small change.

Trivial one-line changes generally do not require an additional test.

Never claim that a check was performed if it was not actually performed.

---

## 8. Handling Ambiguity

If requirements are unclear:

1. Check existing code and documentation first.
2. Check repository `AGENTS.md` and `MEMORY.md` where applicable.
3. Identify the smallest reasonable assumption.
4. Ask for clarification when the ambiguity can materially change the implementation.

Do not silently make large assumptions.

When a request appears more complex than necessary, question whether the requested complexity is actually required.

---

## 9. Common Mistakes to Avoid

* Do not modify unrelated files.
* Do not recreate functionality that already exists.
* Do not manually modify generated files unless explicitly required.
* Do not introduce dependencies without checking existing dependencies first.
* Do not add abstractions without a demonstrated need.
* Do not remove existing behavior without understanding why it exists.
* Do not change API contracts without checking their consumers.
* Do not patch symptoms when the shared root cause can be fixed.
* Do not solve hypothetical future requirements unless explicitly requested.
* Do not claim something is tested when it has not been tested.
* Do not treat a small diff as automatically correct.

---

## 10. Learning From Mistakes

When a mistake is identified, do not only fix the immediate issue.

Determine:

1. What caused the mistake?
2. Could it have been prevented earlier?
3. Is the prevention best handled by:

   * an agent instruction,
   * repository documentation,
   * a test,
   * a lint/type check,
   * CI validation,
   * or a development process change?

Update the appropriate mechanism when necessary.

Prefer enforcement over documentation when a mistake can be reliably detected by a test, lint rule, type check, or CI check.

The goal is to prevent repeated mistakes, not simply document them.

---

# Memory Management

## When to Update MEMORY.md

Update `MEMORY.md` only when you discover information that is:

* Important for future work
* Stable or likely to remain relevant
* Not already documented
* Useful for preventing future mistakes
* A confirmed architectural, product, or workflow decision

Do NOT add:

* Temporary debugging information
* One-time errors
* Personal assumptions
* Information that can easily become outdated
* Every implementation detail
* Information already present in `MEMORY.md`

Do not treat `MEMORY.md` as a task log.

---

## Before Updating Memory

Before writing to `MEMORY.md`:

1. Read the existing `MEMORY.md`.
2. Check whether the information already exists.
3. Determine whether the information is worth retaining.
4. If it is a recurring mistake, prefer adding a prevention rule to `AGENTS.md`.
5. If it is machine-detectable, prefer a test, lint rule, type check, or CI validation.
6. If it is stable project knowledge, add it to `MEMORY.md`.
7. If it belongs to detailed system documentation, add it to the appropriate `docs/` file instead.

Do not write to memory simply because something was discovered during a task.

---

## Memory Update Format

When adding a new memory, use:

## [Category]

### [Short Title]

Context: What was discovered.

Decision/Learning: What should be remembered.

Reason: Why this matters for future work.

Date: YYYY-MM-DD

