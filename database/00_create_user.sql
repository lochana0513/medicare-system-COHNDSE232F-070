-- =====================================================================
--  MediCare Appointment Management System
--  00_create_user.sql  -  Creates the MEDICARE schema owner.
--  Run ONCE as SYS / SYSTEM, connected to the pluggable database
--  (Oracle 19c default: ORCLPDB), e.g.
--      sqlplus sys@localhost:1521/orclpdb as sysdba @00_create_user.sql
-- =====================================================================

ACCEPT medicare_pwd CHAR PROMPT 'Password for new MEDICARE user: ' HIDE

CREATE USER medicare IDENTIFIED BY "&medicare_pwd"
    DEFAULT TABLESPACE users
    TEMPORARY TABLESPACE temp
    QUOTA UNLIMITED ON users;

GRANT CREATE SESSION, CREATE TABLE, CREATE VIEW, CREATE MATERIALIZED VIEW,
      CREATE SEQUENCE, CREATE PROCEDURE, CREATE TRIGGER, CREATE TYPE,
      CREATE SYNONYM, CREATE JOB TO medicare;
