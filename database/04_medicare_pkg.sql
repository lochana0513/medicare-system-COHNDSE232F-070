-- =====================================================================
--  MediCare Appointment Management System
--  04_medicare_pkg.sql  -  Core business logic (procedures + functions)
--
--  Procedures do NOT commit: the caller (application / test script)
--  owns the transaction. Only LOG_ERROR commits, as an autonomous
--  transaction, so errors are kept even when the caller rolls back.
--
--  Application error codes
--    -20001  record not found              -20007  invalid status change
--    -20002  doctor not accepting patients -20008  payment not allowed
--    -20003  date in the past              -20009  consultation not allowed
--    -20004  doctor not available that day -20010  duplicate patient
--    -20005  duplicate booking             -20011  invalid data
--    -20006  session fully booked          -20012  invalid report parameters
-- =====================================================================

CREATE OR REPLACE PACKAGE medicare_pkg AS

    -- ---------- functions ----------
    FUNCTION fn_patient_age      (p_patient_id IN NUMBER) RETURN NUMBER;
    FUNCTION fn_available_slots  (p_schedule_id IN NUMBER, p_date IN DATE) RETURN NUMBER;
    FUNCTION fn_doctor_revenue   (p_doctor_id IN NUMBER, p_from IN DATE, p_to IN DATE) RETURN NUMBER;
    FUNCTION fn_completion_rate  (p_doctor_id IN NUMBER, p_from IN DATE, p_to IN DATE) RETURN NUMBER;

    -- ---------- patients ----------
    PROCEDURE pr_register_patient (
        p_first_name    IN  patient.first_name%TYPE,
        p_last_name     IN  patient.last_name%TYPE,
        p_nic           IN  patient.nic%TYPE,
        p_date_of_birth IN  patient.date_of_birth%TYPE,
        p_gender        IN  patient.gender%TYPE,
        p_phone         IN  patient.phone%TYPE,
        p_email         IN  patient.email%TYPE       DEFAULT NULL,
        p_address       IN  patient.address%TYPE     DEFAULT NULL,
        p_blood_group   IN  patient.blood_group%TYPE DEFAULT NULL,
        p_patient_id    OUT patient.patient_id%TYPE);

    -- ---------- appointments ----------
    PROCEDURE pr_book_appointment (
        p_patient_id     IN  appointment.patient_id%TYPE,
        p_schedule_id    IN  appointment.schedule_id%TYPE,
        p_date           IN  DATE,
        p_payment_method IN  payment.payment_method%TYPE DEFAULT 'CASH',
        p_notes          IN  appointment.notes%TYPE       DEFAULT NULL,
        p_appointment_id OUT appointment.appointment_id%TYPE,
        p_queue_no       OUT appointment.queue_no%TYPE);

    PROCEDURE pr_confirm_appointment (p_appointment_id IN NUMBER);
    PROCEDURE pr_cancel_appointment  (p_appointment_id IN NUMBER);
    PROCEDURE pr_mark_past_no_shows  (p_count OUT NUMBER);

    -- ---------- payments ----------
    PROCEDURE pr_process_payment (
        p_appointment_id IN NUMBER,
        p_method         IN payment.payment_method%TYPE DEFAULT NULL);

    -- ---------- consultations ----------
    PROCEDURE pr_record_consultation (
        p_appointment_id  IN  consultation.appointment_id%TYPE,
        p_symptoms        IN  consultation.symptoms%TYPE,
        p_diagnosis       IN  consultation.diagnosis%TYPE,
        p_notes           IN  consultation.notes%TYPE          DEFAULT NULL,
        p_follow_up_date  IN  consultation.follow_up_date%TYPE DEFAULT NULL,
        p_consultation_id OUT consultation.consultation_id%TYPE);

    PROCEDURE pr_add_prescription_item (
        p_consultation_id IN  prescription_item.consultation_id%TYPE,
        p_medicine_name   IN  prescription_item.medicine_name%TYPE,
        p_dosage          IN  prescription_item.dosage%TYPE,
        p_frequency       IN  prescription_item.frequency%TYPE,
        p_duration_days   IN  prescription_item.duration_days%TYPE,
        p_instructions    IN  prescription_item.instructions%TYPE DEFAULT NULL,
        p_item_id         OUT prescription_item.item_id%TYPE);

    -- ---------- utilities ----------
    PROCEDURE log_error (p_source IN VARCHAR2, p_code IN NUMBER, p_message IN VARCHAR2);

END medicare_pkg;
/

CREATE OR REPLACE PACKAGE BODY medicare_pkg AS

    -- Oracle errors mapped to named exceptions
    e_check_violation EXCEPTION;
    PRAGMA EXCEPTION_INIT(e_check_violation, -2290);   -- ORA-02290 check constraint violated
    e_parent_missing  EXCEPTION;
    PRAGMA EXCEPTION_INIT(e_parent_missing, -2291);    -- ORA-02291 parent key not found

    c_lang CONSTANT VARCHAR2(30) := 'NLS_DATE_LANGUAGE=ENGLISH';

    -- =================================================================
    --  Utilities
    -- =================================================================
    PROCEDURE log_error (p_source IN VARCHAR2, p_code IN NUMBER, p_message IN VARCHAR2) IS
        PRAGMA AUTONOMOUS_TRANSACTION;
    BEGIN
        INSERT INTO error_log (source, error_code, error_message)
        VALUES (p_source, p_code, SUBSTR(p_message, 1, 4000));
        COMMIT;
    END log_error;

    -- Locks the appointment row and returns its current status
    FUNCTION lock_appointment (p_appointment_id IN NUMBER) RETURN appointment%ROWTYPE IS
        v_appt appointment%ROWTYPE;
    BEGIN
        SELECT * INTO v_appt
        FROM   appointment
        WHERE  appointment_id = p_appointment_id
        FOR UPDATE;
        RETURN v_appt;
    EXCEPTION
        WHEN NO_DATA_FOUND THEN
            RAISE_APPLICATION_ERROR(-20001, 'Appointment ' || p_appointment_id || ' not found');
    END lock_appointment;

    -- =================================================================
    --  Functions
    -- =================================================================
    FUNCTION fn_patient_age (p_patient_id IN NUMBER) RETURN NUMBER IS
        v_dob patient.date_of_birth%TYPE;
    BEGIN
        SELECT date_of_birth INTO v_dob FROM patient WHERE patient_id = p_patient_id;
        RETURN TRUNC(MONTHS_BETWEEN(SYSDATE, v_dob) / 12);
    EXCEPTION
        WHEN NO_DATA_FOUND THEN
            RETURN NULL;
    END fn_patient_age;

    FUNCTION fn_available_slots (p_schedule_id IN NUMBER, p_date IN DATE) RETURN NUMBER IS
        v_max    doctor_schedule.max_patients%TYPE;
        v_booked NUMBER;
    BEGIN
        SELECT max_patients INTO v_max FROM doctor_schedule WHERE schedule_id = p_schedule_id;

        SELECT COUNT(*) INTO v_booked
        FROM   appointment
        WHERE  schedule_id      = p_schedule_id
        AND    appointment_date = TRUNC(p_date)
        AND    status          <> 'CANCELLED';

        RETURN GREATEST(v_max - v_booked, 0);
    EXCEPTION
        WHEN NO_DATA_FOUND THEN
            RETURN 0;
    END fn_available_slots;

    FUNCTION fn_doctor_revenue (p_doctor_id IN NUMBER, p_from IN DATE, p_to IN DATE) RETURN NUMBER IS
        v_total NUMBER;
    BEGIN
        SELECT NVL(SUM(p.amount), 0) INTO v_total
        FROM   payment p
        JOIN   appointment     a ON a.appointment_id = p.appointment_id
        JOIN   doctor_schedule s ON s.schedule_id    = a.schedule_id
        WHERE  s.doctor_id = p_doctor_id
        AND    p.payment_status = 'PAID'
        AND    a.appointment_date BETWEEN TRUNC(p_from) AND TRUNC(p_to);
        RETURN v_total;
    END fn_doctor_revenue;

    -- % of non-cancelled appointments that were completed (NULL if none)
    FUNCTION fn_completion_rate (p_doctor_id IN NUMBER, p_from IN DATE, p_to IN DATE) RETURN NUMBER IS
        v_completed NUMBER;
        v_held      NUMBER;
    BEGIN
        SELECT SUM(CASE WHEN a.status = 'COMPLETED' THEN 1 ELSE 0 END),
               SUM(CASE WHEN a.status IN ('COMPLETED', 'NO_SHOW') THEN 1 ELSE 0 END)
        INTO   v_completed, v_held
        FROM   appointment a
        JOIN   doctor_schedule s ON s.schedule_id = a.schedule_id
        WHERE  s.doctor_id = p_doctor_id
        AND    a.appointment_date BETWEEN TRUNC(p_from) AND TRUNC(p_to);

        RETURN CASE WHEN NVL(v_held, 0) = 0 THEN NULL
                    ELSE ROUND(100 * v_completed / v_held, 1) END;
    END fn_completion_rate;

    -- =================================================================
    --  Patients
    -- =================================================================
    PROCEDURE pr_register_patient (
        p_first_name    IN  patient.first_name%TYPE,
        p_last_name     IN  patient.last_name%TYPE,
        p_nic           IN  patient.nic%TYPE,
        p_date_of_birth IN  patient.date_of_birth%TYPE,
        p_gender        IN  patient.gender%TYPE,
        p_phone         IN  patient.phone%TYPE,
        p_email         IN  patient.email%TYPE       DEFAULT NULL,
        p_address       IN  patient.address%TYPE     DEFAULT NULL,
        p_blood_group   IN  patient.blood_group%TYPE DEFAULT NULL,
        p_patient_id    OUT patient.patient_id%TYPE) IS
    BEGIN
        IF p_date_of_birth > SYSDATE THEN
            RAISE_APPLICATION_ERROR(-20011, 'Date of birth cannot be in the future');
        END IF;

        INSERT INTO patient (first_name, last_name, nic, date_of_birth, gender, phone,
                             email, address, blood_group, registered_date)
        VALUES (p_first_name, p_last_name, p_nic, TRUNC(p_date_of_birth), UPPER(p_gender), p_phone,
                p_email, p_address, UPPER(p_blood_group), TRUNC(SYSDATE))
        RETURNING patient_id INTO p_patient_id;
    EXCEPTION
        WHEN DUP_VAL_ON_INDEX THEN
            log_error('MEDICARE_PKG.PR_REGISTER_PATIENT', SQLCODE, SQLERRM);
            RAISE_APPLICATION_ERROR(-20010, 'A patient with this NIC or email is already registered');
        WHEN e_check_violation THEN
            log_error('MEDICARE_PKG.PR_REGISTER_PATIENT', SQLCODE, SQLERRM);
            RAISE_APPLICATION_ERROR(-20011, 'Invalid patient data: ' || SQLERRM);
        WHEN OTHERS THEN
            log_error('MEDICARE_PKG.PR_REGISTER_PATIENT', SQLCODE, SQLERRM);
            RAISE;
    END pr_register_patient;

    -- =================================================================
    --  Appointments
    -- =================================================================
    PROCEDURE pr_book_appointment (
        p_patient_id     IN  appointment.patient_id%TYPE,
        p_schedule_id    IN  appointment.schedule_id%TYPE,
        p_date           IN  DATE,
        p_payment_method IN  payment.payment_method%TYPE DEFAULT 'CASH',
        p_notes          IN  appointment.notes%TYPE       DEFAULT NULL,
        p_appointment_id OUT appointment.appointment_id%TYPE,
        p_queue_no       OUT appointment.queue_no%TYPE) IS

        v_sched       doctor_schedule%ROWTYPE;
        v_doc_status  doctor.status%TYPE;
        v_fee         doctor.consultation_fee%TYPE;
        v_date        DATE := TRUNC(p_date);
        v_count       NUMBER;
    BEGIN
        -- 1. patient must exist
        BEGIN
            SELECT 1 INTO v_count FROM patient WHERE patient_id = p_patient_id;
        EXCEPTION
            WHEN NO_DATA_FOUND THEN
                RAISE_APPLICATION_ERROR(-20001, 'Patient ' || p_patient_id || ' not found');
        END;

        -- 2. lock the schedule row so concurrent bookings get distinct queue numbers
        BEGIN
            SELECT * INTO v_sched
            FROM   doctor_schedule
            WHERE  schedule_id = p_schedule_id
            FOR UPDATE;
        EXCEPTION
            WHEN NO_DATA_FOUND THEN
                RAISE_APPLICATION_ERROR(-20001, 'Schedule ' || p_schedule_id || ' not found');
        END;

        SELECT status, consultation_fee INTO v_doc_status, v_fee
        FROM   doctor WHERE doctor_id = v_sched.doctor_id;

        -- 3. business rules
        IF v_doc_status <> 'ACTIVE' THEN
            RAISE_APPLICATION_ERROR(-20002, 'Doctor is not accepting appointments (status: ' || v_doc_status || ')');
        END IF;

        IF v_date < TRUNC(SYSDATE) THEN
            RAISE_APPLICATION_ERROR(-20003, 'Appointment date cannot be in the past');
        END IF;

        IF TO_CHAR(v_date, 'DY', c_lang) <> v_sched.day_of_week THEN
            RAISE_APPLICATION_ERROR(-20004, 'This session runs on ' || v_sched.day_of_week ||
                                            ', but ' || TO_CHAR(v_date, 'YYYY-MM-DD') || ' is a ' ||
                                            TO_CHAR(v_date, 'DY', c_lang));
        END IF;

        SELECT COUNT(*) INTO v_count
        FROM   appointment a
        JOIN   doctor_schedule s ON s.schedule_id = a.schedule_id
        WHERE  a.patient_id       = p_patient_id
        AND    s.doctor_id        = v_sched.doctor_id
        AND    a.appointment_date = v_date
        AND    a.status          <> 'CANCELLED';
        IF v_count > 0 THEN
            RAISE_APPLICATION_ERROR(-20005, 'Patient already has an appointment with this doctor on this date');
        END IF;

        IF fn_available_slots(p_schedule_id, v_date) = 0 THEN
            RAISE_APPLICATION_ERROR(-20006, 'Session is fully booked (' || v_sched.max_patients || ' patients)');
        END IF;

        -- 4. create the appointment with the next queue number
        SELECT NVL(MAX(queue_no), 0) + 1 INTO p_queue_no
        FROM   appointment
        WHERE  schedule_id = p_schedule_id AND appointment_date = v_date;

        INSERT INTO appointment (patient_id, schedule_id, appointment_date, queue_no, status, notes)
        VALUES (p_patient_id, p_schedule_id, v_date, p_queue_no, 'BOOKED', p_notes)
        RETURNING appointment_id INTO p_appointment_id;

        -- 5. pending payment for the doctor's fee
        INSERT INTO payment (appointment_id, amount, payment_method, payment_status)
        VALUES (p_appointment_id, v_fee, UPPER(NVL(p_payment_method, 'CASH')), 'PENDING');
    EXCEPTION
        WHEN e_check_violation THEN
            log_error('MEDICARE_PKG.PR_BOOK_APPOINTMENT', SQLCODE, SQLERRM);
            RAISE_APPLICATION_ERROR(-20011, 'Invalid booking data: ' || SQLERRM);
        WHEN OTHERS THEN
            log_error('MEDICARE_PKG.PR_BOOK_APPOINTMENT', SQLCODE, SQLERRM);
            RAISE;
    END pr_book_appointment;

    PROCEDURE pr_confirm_appointment (p_appointment_id IN NUMBER) IS
        v_appt appointment%ROWTYPE;
    BEGIN
        v_appt := lock_appointment(p_appointment_id);
        IF v_appt.status <> 'BOOKED' THEN
            RAISE_APPLICATION_ERROR(-20007, 'Only BOOKED appointments can be confirmed (current: ' || v_appt.status || ')');
        END IF;
        UPDATE appointment SET status = 'CONFIRMED' WHERE appointment_id = p_appointment_id;
    EXCEPTION
        WHEN OTHERS THEN
            log_error('MEDICARE_PKG.PR_CONFIRM_APPOINTMENT', SQLCODE, SQLERRM);
            RAISE;
    END pr_confirm_appointment;

    PROCEDURE pr_cancel_appointment (p_appointment_id IN NUMBER) IS
        v_appt appointment%ROWTYPE;
    BEGIN
        v_appt := lock_appointment(p_appointment_id);
        IF v_appt.status NOT IN ('BOOKED', 'CONFIRMED') THEN
            RAISE_APPLICATION_ERROR(-20007, 'Only BOOKED or CONFIRMED appointments can be cancelled (current: ' || v_appt.status || ')');
        END IF;

        UPDATE appointment SET status = 'CANCELLED' WHERE appointment_id = p_appointment_id;

        -- money already taken is refunded; unpaid payment records are removed
        UPDATE payment SET payment_status = 'REFUNDED'
        WHERE  appointment_id = p_appointment_id AND payment_status = 'PAID';

        DELETE FROM payment
        WHERE  appointment_id = p_appointment_id AND payment_status IN ('PENDING', 'FAILED');
    EXCEPTION
        WHEN OTHERS THEN
            log_error('MEDICARE_PKG.PR_CANCEL_APPOINTMENT', SQLCODE, SQLERRM);
            RAISE;
    END pr_cancel_appointment;

    -- Nightly job: anything still BOOKED/CONFIRMED after its date is a no-show.
    -- Explicit cursor with FOR UPDATE / WHERE CURRENT OF.
    PROCEDURE pr_mark_past_no_shows (p_count OUT NUMBER) IS
        CURSOR c_missed IS
            SELECT appointment_id
            FROM   appointment
            WHERE  status IN ('BOOKED', 'CONFIRMED')
            AND    appointment_date < TRUNC(SYSDATE)
            FOR UPDATE OF status;
    BEGIN
        p_count := 0;
        FOR r IN c_missed LOOP
            UPDATE appointment SET status = 'NO_SHOW' WHERE CURRENT OF c_missed;
            p_count := p_count + 1;
        END LOOP;
        DBMS_OUTPUT.PUT_LINE(p_count || ' appointment(s) marked as NO_SHOW');
    EXCEPTION
        WHEN OTHERS THEN
            log_error('MEDICARE_PKG.PR_MARK_PAST_NO_SHOWS', SQLCODE, SQLERRM);
            RAISE;
    END pr_mark_past_no_shows;

    -- =================================================================
    --  Payments
    -- =================================================================
    PROCEDURE pr_process_payment (
        p_appointment_id IN NUMBER,
        p_method         IN payment.payment_method%TYPE DEFAULT NULL) IS

        v_appt    appointment%ROWTYPE;
        v_payment payment%ROWTYPE;
        v_fee     doctor.consultation_fee%TYPE;
    BEGIN
        v_appt := lock_appointment(p_appointment_id);
        IF v_appt.status IN ('CANCELLED', 'NO_SHOW') THEN
            RAISE_APPLICATION_ERROR(-20008, 'Cannot take payment for a ' || v_appt.status || ' appointment');
        END IF;

        BEGIN
            SELECT * INTO v_payment FROM payment
            WHERE  appointment_id = p_appointment_id FOR UPDATE;
        EXCEPTION
            WHEN NO_DATA_FOUND THEN
                v_payment.payment_id := NULL;
        END;

        IF v_payment.payment_id IS NULL THEN
            SELECT d.consultation_fee INTO v_fee
            FROM   doctor_schedule s JOIN doctor d ON d.doctor_id = s.doctor_id
            WHERE  s.schedule_id = v_appt.schedule_id;

            INSERT INTO payment (appointment_id, amount, payment_method, payment_status, payment_date)
            VALUES (p_appointment_id, v_fee, UPPER(NVL(p_method, 'CASH')), 'PAID', SYSDATE);
        ELSIF v_payment.payment_status = 'PAID' THEN
            RAISE_APPLICATION_ERROR(-20008, 'Appointment ' || p_appointment_id || ' is already paid');
        ELSE
            UPDATE payment
            SET    payment_status = 'PAID',
                   payment_method = UPPER(NVL(p_method, payment_method)),
                   payment_date   = SYSDATE
            WHERE  payment_id = v_payment.payment_id;
        END IF;
    EXCEPTION
        WHEN e_check_violation THEN
            log_error('MEDICARE_PKG.PR_PROCESS_PAYMENT', SQLCODE, SQLERRM);
            RAISE_APPLICATION_ERROR(-20011, 'Invalid payment method: ' || p_method);
        WHEN OTHERS THEN
            log_error('MEDICARE_PKG.PR_PROCESS_PAYMENT', SQLCODE, SQLERRM);
            RAISE;
    END pr_process_payment;

    -- =================================================================
    --  Consultations
    -- =================================================================
    PROCEDURE pr_record_consultation (
        p_appointment_id  IN  consultation.appointment_id%TYPE,
        p_symptoms        IN  consultation.symptoms%TYPE,
        p_diagnosis       IN  consultation.diagnosis%TYPE,
        p_notes           IN  consultation.notes%TYPE          DEFAULT NULL,
        p_follow_up_date  IN  consultation.follow_up_date%TYPE DEFAULT NULL,
        p_consultation_id OUT consultation.consultation_id%TYPE) IS

        v_appt appointment%ROWTYPE;
    BEGIN
        v_appt := lock_appointment(p_appointment_id);

        IF v_appt.status NOT IN ('BOOKED', 'CONFIRMED') THEN
            RAISE_APPLICATION_ERROR(-20009, 'Consultation can only be recorded for BOOKED or CONFIRMED appointments (current: ' || v_appt.status || ')');
        END IF;
        IF v_appt.appointment_date > TRUNC(SYSDATE) THEN
            RAISE_APPLICATION_ERROR(-20009, 'Consultation cannot be recorded before the appointment date (' ||
                                            TO_CHAR(v_appt.appointment_date, 'YYYY-MM-DD') || ')');
        END IF;
        IF p_follow_up_date IS NOT NULL AND TRUNC(p_follow_up_date) <= TRUNC(SYSDATE) THEN
            RAISE_APPLICATION_ERROR(-20009, 'Follow-up date must be after today');
        END IF;

        INSERT INTO consultation (appointment_id, consultation_date, symptoms, diagnosis, notes, follow_up_date)
        VALUES (p_appointment_id, TRUNC(SYSDATE), p_symptoms, p_diagnosis, p_notes, TRUNC(p_follow_up_date))
        RETURNING consultation_id INTO p_consultation_id;

        UPDATE appointment SET status = 'COMPLETED' WHERE appointment_id = p_appointment_id;
    EXCEPTION
        WHEN OTHERS THEN
            log_error('MEDICARE_PKG.PR_RECORD_CONSULTATION', SQLCODE, SQLERRM);
            RAISE;
    END pr_record_consultation;

    PROCEDURE pr_add_prescription_item (
        p_consultation_id IN  prescription_item.consultation_id%TYPE,
        p_medicine_name   IN  prescription_item.medicine_name%TYPE,
        p_dosage          IN  prescription_item.dosage%TYPE,
        p_frequency       IN  prescription_item.frequency%TYPE,
        p_duration_days   IN  prescription_item.duration_days%TYPE,
        p_instructions    IN  prescription_item.instructions%TYPE DEFAULT NULL,
        p_item_id         OUT prescription_item.item_id%TYPE) IS
    BEGIN
        INSERT INTO prescription_item (consultation_id, medicine_name, dosage, frequency, duration_days, instructions)
        VALUES (p_consultation_id, p_medicine_name, p_dosage, p_frequency, p_duration_days, p_instructions)
        RETURNING item_id INTO p_item_id;
    EXCEPTION
        WHEN e_parent_missing THEN
            log_error('MEDICARE_PKG.PR_ADD_PRESCRIPTION_ITEM', SQLCODE, SQLERRM);
            RAISE_APPLICATION_ERROR(-20001, 'Consultation ' || p_consultation_id || ' not found');
        WHEN e_check_violation THEN
            log_error('MEDICARE_PKG.PR_ADD_PRESCRIPTION_ITEM', SQLCODE, SQLERRM);
            RAISE_APPLICATION_ERROR(-20011, 'Duration must be between 1 and 365 days');
        WHEN OTHERS THEN
            log_error('MEDICARE_PKG.PR_ADD_PRESCRIPTION_ITEM', SQLCODE, SQLERRM);
            RAISE;
    END pr_add_prescription_item;

END medicare_pkg;
/

SHOW ERRORS PACKAGE BODY medicare_pkg
