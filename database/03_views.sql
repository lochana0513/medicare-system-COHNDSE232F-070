-- =====================================================================
--  MediCare Appointment Management System
--  03_views.sql  -  Views and materialized views
-- =====================================================================

-- ---------------------------------------------------------------------
--  V_APPOINTMENT_DETAILS: one row per appointment with every name the
--  application needs to display (patient, doctor, hospital, payment).
-- ---------------------------------------------------------------------
CREATE OR REPLACE VIEW v_appointment_details AS
SELECT a.appointment_id,
       a.appointment_date,
       a.queue_no,
       a.status,
       a.booked_at,
       a.notes,
       p.patient_id,
       p.first_name || ' ' || p.last_name           AS patient_name,
       p.nic                                        AS patient_nic,
       p.phone                                      AS patient_phone,
       s.schedule_id,
       s.day_of_week,
       s.start_time,
       s.end_time,
       d.doctor_id,
       'Dr. ' || d.first_name || ' ' || d.last_name AS doctor_name,
       sp.specialization_id,
       sp.name                                      AS specialization,
       h.hospital_id,
       h.name                                       AS hospital_name,
       h.city                                       AS hospital_city,
       pay.payment_id,
       pay.amount,
       pay.payment_method,
       pay.payment_status,
       pay.payment_date,
       c.consultation_id
FROM   appointment     a
JOIN   patient         p   ON p.patient_id         = a.patient_id
JOIN   doctor_schedule s   ON s.schedule_id        = a.schedule_id
JOIN   doctor          d   ON d.doctor_id          = s.doctor_id
JOIN   specialization  sp  ON sp.specialization_id = d.specialization_id
JOIN   hospital        h   ON h.hospital_id        = s.hospital_id
LEFT JOIN payment      pay ON pay.appointment_id   = a.appointment_id
LEFT JOIN consultation c   ON c.appointment_id     = a.appointment_id;

-- ---------------------------------------------------------------------
--  V_DOCTOR_DIRECTORY: doctors with specialization and where they consult
-- ---------------------------------------------------------------------
CREATE OR REPLACE VIEW v_doctor_directory AS
SELECT d.doctor_id,
       'Dr. ' || d.first_name || ' ' || d.last_name AS doctor_name,
       sp.name                                      AS specialization,
       d.consultation_fee,
       d.experience_years,
       d.status,
       s.schedule_id,
       h.name                                       AS hospital_name,
       h.city,
       s.day_of_week,
       s.start_time,
       s.end_time,
       s.max_patients
FROM   doctor          d
JOIN   specialization  sp ON sp.specialization_id = d.specialization_id
LEFT JOIN doctor_schedule s ON s.doctor_id  = d.doctor_id
LEFT JOIN hospital        h ON h.hospital_id = s.hospital_id;

-- ---------------------------------------------------------------------
--  MV_MONTHLY_REVENUE: pre-aggregated revenue per hospital per month.
--  Refreshed on demand and nightly by JOB_REFRESH_REVENUE_MV.
-- ---------------------------------------------------------------------
BEGIN
    EXECUTE IMMEDIATE 'DROP MATERIALIZED VIEW mv_monthly_revenue';
EXCEPTION
    WHEN OTHERS THEN
        IF SQLCODE != -12003 THEN RAISE; END IF;   -- ORA-12003: MV does not exist
END;
/

CREATE MATERIALIZED VIEW mv_monthly_revenue
BUILD IMMEDIATE
REFRESH COMPLETE ON DEMAND
AS
SELECT TRUNC(a.appointment_date, 'MM')                                        AS month_start,
       h.hospital_id,
       h.name                                                                 AS hospital_name,
       COUNT(*)                                                               AS total_appointments,
       SUM(CASE WHEN a.status = 'COMPLETED' THEN 1 ELSE 0 END)                AS completed_appointments,
       SUM(CASE WHEN p.payment_status = 'PAID'     THEN p.amount ELSE 0 END)  AS paid_revenue,
       SUM(CASE WHEN p.payment_status = 'REFUNDED' THEN p.amount ELSE 0 END)  AS refunded_amount
FROM   appointment     a
JOIN   doctor_schedule s ON s.schedule_id = a.schedule_id
JOIN   hospital        h ON h.hospital_id = s.hospital_id
LEFT JOIN payment      p ON p.appointment_id = a.appointment_id
GROUP BY TRUNC(a.appointment_date, 'MM'), h.hospital_id, h.name;
