-- Add roadmap completion as a first-class badge condition type.
ALTER TYPE "ConditionType" ADD VALUE IF NOT EXISTS 'ROADMAP_COMPLETED';
