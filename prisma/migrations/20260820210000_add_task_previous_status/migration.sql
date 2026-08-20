-- Preserve the task workflow position when a list checkbox marks it as done.
ALTER TABLE "Task" ADD COLUMN "previousStatus" TEXT;
