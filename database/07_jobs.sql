-- =====================================================================
--  MediCare Appointment Management System
--  07_jobs.sql  -  DBMS_SCHEDULER jobs
--    JOB_REFRESH_REVENUE_MV  01:00 daily  refresh MV_MONTHLY_REVENUE
--    JOB_MARK_NO_SHOWS       23:30 daily  mark missed appointments NO_SHOW
-- =====================================================================

BEGIN
    FOR j IN (SELECT job_name FROM user_scheduler_jobs
              WHERE job_name IN ('JOB_REFRESH_REVENUE_MV', 'JOB_MARK_NO_SHOWS')) LOOP
        DBMS_SCHEDULER.DROP_JOB(j.job_name, force => TRUE);
    END LOOP;

    DBMS_SCHEDULER.CREATE_JOB(
        job_name        => 'JOB_REFRESH_REVENUE_MV',
        job_type        => 'PLSQL_BLOCK',
        job_action      => 'BEGIN DBMS_MVIEW.REFRESH(''MV_MONTHLY_REVENUE'', ''C''); END;',
        start_date      => SYSTIMESTAMP,
        repeat_interval => 'FREQ=DAILY;BYHOUR=1;BYMINUTE=0;BYSECOND=0',
        enabled         => TRUE,
        comments        => 'Nightly complete refresh of the monthly revenue materialized view');

    DBMS_SCHEDULER.CREATE_JOB(
        job_name        => 'JOB_MARK_NO_SHOWS',
        job_type        => 'PLSQL_BLOCK',
        job_action      => 'DECLARE v_count NUMBER; BEGIN medicare_pkg.pr_mark_past_no_shows(v_count); COMMIT; END;',
        start_date      => SYSTIMESTAMP,
        repeat_interval => 'FREQ=DAILY;BYHOUR=23;BYMINUTE=30;BYSECOND=0',
        enabled         => TRUE,
        comments        => 'Marks BOOKED/CONFIRMED appointments whose date has passed as NO_SHOW');
END;
/
