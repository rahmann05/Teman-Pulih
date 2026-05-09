-- 1. Enable Required Extensions
CREATE EXTENSION IF NOT EXISTS pg_net;
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- 2. Create the Cron Job for Medication Reminders
-- This job runs every minute. It finds schedules where the current time matches the time_slots.
-- In a real production scenario, you would parse the time_slots more carefully or normalize them into a separate table.
-- Assuming time_slots is a comma-separated string like '08:00,13:00,20:00'.

SELECT cron.schedule(
  'medication-reminder-job',
  '* * * * *', -- Every minute
  $$
  WITH due_medications AS (
      SELECT 
          ms.id as schedule_id,
          m.user_id,
          m.name as medication_name,
          m.dosage
      FROM medication_schedules ms
      JOIN medications m ON ms.medication_id = m.id
      -- Simple check: if current time HH:MM is in the time_slots string
      WHERE position(to_char(now() AT TIME ZONE 'Asia/Jakarta', 'HH24:MI') in ms.time_slots) > 0
        AND CURRENT_DATE BETWEEN ms.start_date AND ms.end_date
  )
  SELECT
      net.http_post(
          url:='https://dbirwtkutyhvywhexwhr.supabase.co/functions/v1/whatsapp-reminder',
          headers:=jsonb_build_object(
              'Content-Type', 'application/json',
              'Authorization', current_setting('request.jwt.claim.role', true) -- Or use a specific secret
          ),
          body:=jsonb_build_object(
              'type', 'medication_reminder',
              'user_id', dm.user_id,
              'message', 'Halo! Waktunya minum obat: ' || dm.medication_name || ' (' || dm.dosage || '). Jangan lupa ya!'
          )
      )
  FROM due_medications dm;
  $$
);

-- Note: 
-- You might need to adjust the Authorization header above to use a secure key (like ANON_KEY or a custom secret) 
-- instead of relying on current_setting if it's run by pg_cron in the background.
-- Example: 'Authorization', 'Bearer YOUR_ANON_KEY'
