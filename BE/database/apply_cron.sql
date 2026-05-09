-- Unschedule first if exists
SELECT cron.unschedule(jobid) FROM cron.job WHERE jobname = 'medication-reminder-job';

-- Schedule the job
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
      WHERE position(to_char(now() AT TIME ZONE 'Asia/Jakarta', 'HH24:MI') in ms.time_slots) > 0
        AND CURRENT_DATE BETWEEN ms.start_date AND ms.end_date
  )
  SELECT
      net.http_post(
          url:='https://dbirwtkutyhvywhexwhr.supabase.co/functions/v1/whatsapp-reminder',
          headers:=jsonb_build_object(
              'Content-Type', 'application/json',
              'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRiaXJ3dGt1dHlodnl3aGV4d2hyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc4MTc3MjAsImV4cCI6MjA5MzM5MzcyMH0.n9zf5EdrcSxxr-k5XJJ26ZAtj_BA89EklQTtjltrB0c'
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
