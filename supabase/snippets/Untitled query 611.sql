insert into user_compliance_items (
  user_id,
  compliance_item_id,
  location_state,
  location_county,
  completed_date,
  expires_date,
  status,
  reminder_enabled,
  next_reminder_date
)
select
  m.id,
  c.id,
  'AZ',
  'Maricopa',
  '2025-01-01',
  '2026-01-01',
  'active',
  true,
  '2025-10-03'
from members m
join compliance_items c on c.name = 'Bloodborne Pathogen Certification'
where m.email = 'kristen@test.com';

insert into user_compliance_items (
  user_id,
  compliance_item_id,
  location_state,
  location_county,
  completed_date,
  expires_date,
  status,
  reminder_enabled,
  next_reminder_date
)
select
  m.id,
  c.id,
  'AZ',
  'Maricopa',
  '2024-06-01',
  '2026-06-01',
  'active',
  true,
  '2026-03-03'
from members m
join compliance_items c on c.name = 'Sharps Disposal Contract'
where m.email = 'kristen@test.com';

insert into user_compliance_items (
  user_id,
  compliance_item_id,
  location_state,
  location_county,
  completed_date,
  expires_date,
  status,
  reminder_enabled,
  next_reminder_date
)
select
  m.id,
  c.id,
  'AZ',
  'Maricopa',
  '2024-01-01',
  '2025-01-01',
  'expired',
  true,
  '2024-10-03'
from members m
join compliance_items c on c.name = 'Shop Permit'
where m.email = 'kristen@test.com';