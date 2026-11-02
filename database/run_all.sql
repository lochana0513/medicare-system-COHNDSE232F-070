-- Builds the MediCare schema, loads sample data and installs the PL/SQL.
-- Run from the database folder as the MEDICARE user:
--     sqlplus medicare@localhost:1521/orclpdb @run_all.sql
-- Then run the tests and reports:
--     sqlplus medicare@localhost:1521/orclpdb @08_test_plsql.sql

SET ECHO OFF FEEDBACK OFF
WHENEVER SQLERROR EXIT SQL.SQLCODE ROLLBACK

PROMPT Creating tables...
@@01_schema.sql
PROMPT Loading sample data...
@@02_sample_data.sql
PROMPT Creating views and materialized view...
@@03_views.sql
PROMPT Creating package MEDICARE_PKG...
@@04_medicare_pkg.sql
PROMPT Creating triggers...
@@05_triggers.sql
PROMPT Creating package MEDICARE_REPORTS...
@@06_reports_pkg.sql
PROMPT Creating scheduler jobs...
@@07_jobs.sql

SET FEEDBACK ON
PROMPT Invalid objects (should be none):
SELECT object_type, object_name FROM user_objects WHERE status <> 'VALID';

PROMPT Row counts:
SELECT 'SPECIALIZATION'    AS table_name, COUNT(*) AS row_count FROM specialization    UNION ALL
SELECT 'HOSPITAL',          COUNT(*) FROM hospital          UNION ALL
SELECT 'DOCTOR',            COUNT(*) FROM doctor            UNION ALL
SELECT 'DOCTOR_SCHEDULE',   COUNT(*) FROM doctor_schedule   UNION ALL
SELECT 'PATIENT',           COUNT(*) FROM patient           UNION ALL
SELECT 'APPOINTMENT',       COUNT(*) FROM appointment       UNION ALL
SELECT 'CONSULTATION',      COUNT(*) FROM consultation      UNION ALL
SELECT 'PRESCRIPTION_ITEM', COUNT(*) FROM prescription_item UNION ALL
SELECT 'PAYMENT',           COUNT(*) FROM payment           UNION ALL
SELECT 'APPOINTMENT_AUDIT', COUNT(*) FROM appointment_audit;
