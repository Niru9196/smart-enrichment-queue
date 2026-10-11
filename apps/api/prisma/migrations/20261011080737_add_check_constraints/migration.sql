-- Invariants Prisma's schema language cannot express. NULL stays allowed: it means "unknown".
ALTER TABLE "companies"
  ADD CONSTRAINT "companies_employee_count_non_negative" CHECK ("employee_count" IS NULL OR "employee_count" >= 0),
  ADD CONSTRAINT "companies_estimated_revenue_non_negative" CHECK ("estimated_revenue" IS NULL OR "estimated_revenue" >= 0),
  ADD CONSTRAINT "companies_name_not_blank" CHECK (btrim("name") <> '');

ALTER TABLE "queue_items"
  ADD CONSTRAINT "queue_items_estimated_credits_non_negative" CHECK ("estimated_credits" >= 0);
