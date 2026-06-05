-- =============================================================================
-- YAG — Smart Novel Writing Platform
-- Migration: V4__init_membership_plans.sql
-- Description: Seed system membership plans ('MONTHLY', 'YEARLY') for production.
-- Author: Nguyễn Duy Trường
-- Created: 2026-06-05
-- =============================================================================

INSERT INTO membership_plans (id, name, duration_days, price, description, is_active, sort_order, created_at, updated_at)
VALUES
  ('MONTHLY', 'Gói Tháng Premium', 30, 50000.00, 'Đọc tất cả chương truyện Premium không giới hạn trong 30 ngày.', true, 1, NOW(), NOW()),
  ('YEARLY', 'Gói Năm Premium', 365, 500000.00, 'Đọc tất cả chương truyện Premium không giới hạn trong 365 ngày (Tiết kiệm 20%).', true, 2, NOW(), NOW())
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  duration_days = EXCLUDED.duration_days,
  price = EXCLUDED.price,
  description = EXCLUDED.description;
