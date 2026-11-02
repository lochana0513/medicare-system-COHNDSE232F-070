-- =====================================================================
--  MediCare Appointment Management System
--  05_triggers.sql  -  Triggers
-- =====================================================================

-- ---------------------------------------------------------------------
--  TRG_PATIENT_NORMALIZE: tidy patient input before it is stored
-- ---------------------------------------------------------------------
CREATE OR REPLACE TRIGGER trg_patient_normalize
BEFORE INSERT OR UPDATE ON patient
FOR EACH ROW
BEGIN
    :NEW.first_name := INITCAP(TRIM(:NEW.first_name));
    :NEW.last_name  := INITCAP(TRIM(:NEW.last_name));
    :NEW.nic        := UPPER(TRIM(:NEW.nic));
    :NEW.email      := LOWER(TRIM(:NEW.email));
    :NEW.phone      := REPLACE(REPLACE(TRIM(:NEW.phone), ' ', ''), '-', '');
END;
/

-- ---------------------------------------------------------------------
--  TRG_APPOINTMENT_VALIDATE: the appointment date must fall on the
--  schedule's weekday, and new bookings need an ACTIVE doctor.
-- ---------------------------------------------------------------------
CREATE OR REPLACE TRIGGER trg_appointment_validate
BEFORE INSERT OR UPDATE OF schedule_id, appointment_date ON appointment
FOR EACH ROW
DECLARE
    v_day        doctor_schedule.day_of_week%TYPE;
    v_doc_status doctor.status%TYPE;
BEGIN
    :NEW.appointment_date := TRUNC(:NEW.appointment_date);

    SELECT s.day_of_week, d.status
    INTO   v_day, v_doc_status
    FROM   doctor_schedule s
    JOIN   doctor d ON d.doctor_id = s.doctor_id
    WHERE  s.schedule_id = :NEW.schedule_id;

    IF TO_CHAR(:NEW.appointment_date, 'DY', 'NLS_DATE_LANGUAGE=ENGLISH') <> v_day THEN
        RAISE_APPLICATION_ERROR(-20004, 'Appointment date ' || TO_CHAR(:NEW.appointment_date, 'YYYY-MM-DD') ||
                                        ' does not match the session day (' || v_day || ')');
    END IF;

    IF INSERTING AND v_doc_status <> 'ACTIVE' THEN
        RAISE_APPLICATION_ERROR(-20002, 'Doctor is not accepting appointments (status: ' || v_doc_status || ')');
    END IF;
EXCEPTION
    WHEN NO_DATA_FOUND THEN
        RAISE_APPLICATION_ERROR(-20001, 'Schedule ' || :NEW.schedule_id || ' not found');
END;
/

-- ---------------------------------------------------------------------
--  TRG_APPOINTMENT_STATUS_FLOW: only allow valid status changes
--      BOOKED    -> CONFIRMED | COMPLETED | CANCELLED | NO_SHOW
--      CONFIRMED -> COMPLETED | CANCELLED | NO_SHOW
--      COMPLETED, CANCELLED, NO_SHOW are final
-- ---------------------------------------------------------------------
CREATE OR REPLACE TRIGGER trg_appointment_status_flow
BEFORE UPDATE OF status ON appointment
FOR EACH ROW
WHEN (NEW.status <> OLD.status)
BEGIN
    IF NOT (   (:OLD.status = 'BOOKED'    AND :NEW.status IN ('CONFIRMED', 'COMPLETED', 'CANCELLED', 'NO_SHOW'))
            OR (:OLD.status = 'CONFIRMED' AND :NEW.status IN ('COMPLETED', 'CANCELLED', 'NO_SHOW'))) THEN
        RAISE_APPLICATION_ERROR(-20007, 'Invalid status change ' || :OLD.status || ' -> ' || :NEW.status);
    END IF;
END;
/

-- ---------------------------------------------------------------------
--  TRG_APPOINTMENT_AUDIT: log every new appointment and status change.
--  changed_by uses the client identifier the application sets
--  (DBMS_SESSION.SET_IDENTIFIER), falling back to the DB user.
-- ---------------------------------------------------------------------
CREATE OR REPLACE TRIGGER trg_appointment_audit
AFTER INSERT OR UPDATE OF status ON appointment
FOR EACH ROW
BEGIN
    IF INSERTING OR :NEW.status <> :OLD.status THEN
        INSERT INTO appointment_audit (appointment_id, old_status, new_status, changed_by, changed_at)
        VALUES (:NEW.appointment_id,
                :OLD.status,                       -- NULL when inserting
                :NEW.status,
                NVL(SYS_CONTEXT('USERENV', 'CLIENT_IDENTIFIER'), USER),
                SYSTIMESTAMP);
    END IF;
END;
/

-- ---------------------------------------------------------------------
--  TRG_PAYMENT_DEFAULTS: amount defaults to the doctor's fee, and a
--  payment that becomes PAID is stamped with today's date.
-- ---------------------------------------------------------------------
CREATE OR REPLACE TRIGGER trg_payment_defaults
BEFORE INSERT OR UPDATE OF payment_status ON payment
FOR EACH ROW
BEGIN
    IF INSERTING AND :NEW.amount IS NULL THEN
        SELECT d.consultation_fee INTO :NEW.amount
        FROM   appointment a
        JOIN   doctor_schedule s ON s.schedule_id = a.schedule_id
        JOIN   doctor d          ON d.doctor_id   = s.doctor_id
        WHERE  a.appointment_id = :NEW.appointment_id;
    END IF;

    IF :NEW.payment_status = 'PAID' AND :NEW.payment_date IS NULL THEN
        :NEW.payment_date := SYSDATE;
    END IF;
END;
/
