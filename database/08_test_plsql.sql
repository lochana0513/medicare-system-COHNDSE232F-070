-- =====================================================================
--  MediCare Appointment Management System
--  08_test_plsql.sql  -  Tests for procedures, functions, triggers,
--  exception handling and reports.
--  Every change is rolled back at the end, so sample data is untouched
--  (only ERROR_LOG keeps rows, because it uses autonomous transactions).
-- =====================================================================

SET SERVEROUTPUT ON SIZE UNLIMITED FORMAT WRAPPED
SET LINESIZE 200 PAGESIZE 100 FEEDBACK OFF VERIFY OFF

DECLARE
    v_passed  PLS_INTEGER := 0;
    v_failed  PLS_INTEGER := 0;
    v_patient NUMBER;
    v_appt    NUMBER;
    v_appt2   NUMBER;
    v_queue   NUMBER;
    v_cons    NUMBER;
    v_item    NUMBER;
    v_sched   NUMBER;
    v_date    DATE;
    v_status  VARCHAR2(200);
    v_count   NUMBER;

    PROCEDURE ok (p_name IN VARCHAR2, p_cond IN BOOLEAN) IS
    BEGIN
        IF p_cond THEN
            v_passed := v_passed + 1;
            DBMS_OUTPUT.PUT_LINE('PASS  ' || p_name);
        ELSE
            v_failed := v_failed + 1;
            DBMS_OUTPUT.PUT_LINE('FAIL  ' || p_name);
        END IF;
    END ok;

    -- record that an expected error was (or was not) raised
    PROCEDURE expect (p_name IN VARCHAR2, p_expected IN NUMBER, p_actual IN NUMBER, p_msg IN VARCHAR2) IS
    BEGIN
        ok(p_name || '  -> ' || CASE WHEN p_actual = 0 THEN 'no error raised' ELSE p_msg END,
           p_actual = p_expected);
    END expect;

    -- next date (from today) on which a schedule runs
    FUNCTION next_session (p_schedule_id IN NUMBER, p_offset_weeks IN NUMBER DEFAULT 0) RETURN DATE IS
        v_day doctor_schedule.day_of_week%TYPE;
        v_d   DATE := TRUNC(SYSDATE);
    BEGIN
        SELECT day_of_week INTO v_day FROM doctor_schedule WHERE schedule_id = p_schedule_id;
        WHILE TO_CHAR(v_d, 'DY', 'NLS_DATE_LANGUAGE=ENGLISH') <> v_day LOOP
            v_d := v_d + 1;
        END LOOP;
        RETURN v_d + 7 * p_offset_weeks;
    END next_session;
BEGIN
    DBMS_SESSION.SET_IDENTIFIER('TEST_SCRIPT');
    DBMS_OUTPUT.PUT_LINE('========== FUNCTIONS ==========');
    ok('fn_patient_age(9) (born 1965-04-07) = ' || medicare_pkg.fn_patient_age(9),
       medicare_pkg.fn_patient_age(9) = TRUNC(MONTHS_BETWEEN(SYSDATE, DATE '1965-04-07') / 12));
    ok('fn_patient_age(unknown) is NULL',            medicare_pkg.fn_patient_age(-1) IS NULL);
    ok('fn_available_slots on an empty session = max',
       medicare_pkg.fn_available_slots(1, next_session(1, 6)) = 20);
    ok('fn_doctor_revenue(2, Jul-Oct) > 0',          medicare_pkg.fn_doctor_revenue(2, DATE '2026-07-01', DATE '2026-10-31') > 0);
    ok('fn_completion_rate between 0 and 100',       medicare_pkg.fn_completion_rate(1, DATE '2026-07-01', DATE '2026-10-31') BETWEEN 0 AND 100);

    DBMS_OUTPUT.PUT_LINE('========== PATIENT REGISTRATION ==========');
    medicare_pkg.pr_register_patient('  tharaka ', 'WIJERATNE', '199812345678', DATE '1998-05-01', 'm',
                                     '077-123 4999', 'Tharaka.W@Gmail.com', 'No 1, Test Road, Colombo', 'b+', v_patient);
    SELECT first_name || '|' || email || '|' || phone INTO v_status FROM patient WHERE patient_id = v_patient;
    ok('register patient + normalize trigger (' || v_status || ')', v_status = 'Tharaka|tharaka.w@gmail.com|0771234999');

    BEGIN
        medicare_pkg.pr_register_patient('Dup', 'Patient', '199812345678', DATE '1998-05-01', 'M', '0771111111',
                                         NULL, NULL, NULL, v_count);
        expect('duplicate NIC rejected', -20010, 0, NULL);
    EXCEPTION WHEN OTHERS THEN expect('duplicate NIC rejected', -20010, SQLCODE, SQLERRM);
    END;

    BEGIN
        medicare_pkg.pr_register_patient('Bad', 'Nic', '12345', DATE '1998-05-01', 'M', '0771111112',
                                         NULL, NULL, NULL, v_count);
        expect('invalid NIC rejected', -20011, 0, NULL);
    EXCEPTION WHEN OTHERS THEN expect('invalid NIC rejected', -20011, SQLCODE, SQLERRM);
    END;

    DBMS_OUTPUT.PUT_LINE('========== BOOKING ==========');
    v_date := next_session(1, 1);
    medicare_pkg.pr_book_appointment(v_patient, 1, v_date, 'ONLINE', 'Test booking', v_appt, v_queue);
    SELECT status INTO v_status FROM appointment WHERE appointment_id = v_appt;
    ok('book appointment on ' || TO_CHAR(v_date, 'YYYY-MM-DD') || ' (queue ' || v_queue || ', ' || v_status || ')',
       v_status = 'BOOKED' AND v_queue >= 1);

    SELECT COUNT(*) INTO v_count FROM payment
    WHERE  appointment_id = v_appt AND payment_status = 'PENDING' AND amount = 2000;
    ok('pending payment created with doctor fee', v_count = 1);

    SELECT COUNT(*) INTO v_count FROM appointment_audit
    WHERE  appointment_id = v_appt AND new_status = 'BOOKED' AND changed_by = 'TEST_SCRIPT';
    ok('audit trigger logged the booking', v_count = 1);

    BEGIN
        medicare_pkg.pr_book_appointment(v_patient, 2, next_session(2, 1) , 'CASH', NULL, v_appt2, v_queue);
        ok('same doctor, other day is allowed', TRUE);
    EXCEPTION WHEN OTHERS THEN ok('same doctor, other day is allowed (' || SQLERRM || ')', FALSE);
    END;

    BEGIN
        medicare_pkg.pr_book_appointment(v_patient, 1, v_date, 'CASH', NULL, v_appt2, v_queue);
        expect('double booking rejected', -20005, 0, NULL);
    EXCEPTION WHEN OTHERS THEN expect('double booking rejected', -20005, SQLCODE, SQLERRM);
    END;

    BEGIN
        medicare_pkg.pr_book_appointment(v_patient, 1, v_date + 1, 'CASH', NULL, v_appt2, v_queue);
        expect('wrong weekday rejected', -20004, 0, NULL);
    EXCEPTION WHEN OTHERS THEN expect('wrong weekday rejected', -20004, SQLCODE, SQLERRM);
    END;

    BEGIN
        medicare_pkg.pr_book_appointment(v_patient, 1, next_session(1) - 7, 'CASH', NULL, v_appt2, v_queue);
        expect('past date rejected', -20003, 0, NULL);
    EXCEPTION WHEN OTHERS THEN expect('past date rejected', -20003, SQLCODE, SQLERRM);
    END;

    BEGIN
        medicare_pkg.pr_book_appointment(v_patient, 21, next_session(21, 1), 'CASH', NULL, v_appt2, v_queue);
        expect('doctor on leave rejected', -20002, 0, NULL);
    EXCEPTION WHEN OTHERS THEN expect('doctor on leave rejected', -20002, SQLCODE, SQLERRM);
    END;

    BEGIN
        medicare_pkg.pr_book_appointment(-99, 1, v_date, 'CASH', NULL, v_appt2, v_queue);
        expect('unknown patient rejected', -20001, 0, NULL);
    EXCEPTION WHEN OTHERS THEN expect('unknown patient rejected', -20001, SQLCODE, SQLERRM);
    END;

    -- fill a small session (schedule 15, max 10) to test capacity
    v_date := next_session(15, 3);
    FOR p IN (SELECT patient_id FROM patient WHERE patient_id <= 10 ORDER BY patient_id) LOOP
        medicare_pkg.pr_book_appointment(p.patient_id, 15, v_date, 'CASH', NULL, v_appt2, v_queue);
    END LOOP;
    ok('fn_available_slots = 0 when session is full', medicare_pkg.fn_available_slots(15, v_date) = 0);
    BEGIN
        medicare_pkg.pr_book_appointment(11, 15, v_date, 'CASH', NULL, v_appt2, v_queue);
        expect('full session rejected', -20006, 0, NULL);
    EXCEPTION WHEN OTHERS THEN expect('full session rejected', -20006, SQLCODE, SQLERRM);
    END;

    v_date := next_session(1) + 1;
    BEGIN
        INSERT INTO appointment (patient_id, schedule_id, appointment_date, queue_no)
        VALUES (12, 1, v_date, 99);
        expect('direct insert on wrong weekday blocked by trigger', -20004, 0, NULL);
    EXCEPTION WHEN OTHERS THEN expect('direct insert on wrong weekday blocked by trigger', -20004, SQLCODE, SQLERRM);
    END;

    DBMS_OUTPUT.PUT_LINE('========== CONFIRM / PAY / CANCEL ==========');
    medicare_pkg.pr_confirm_appointment(v_appt);
    SELECT status INTO v_status FROM appointment WHERE appointment_id = v_appt;
    ok('confirm appointment', v_status = 'CONFIRMED');

    medicare_pkg.pr_process_payment(v_appt);
    SELECT payment_status || '|' || payment_method INTO v_status FROM payment WHERE appointment_id = v_appt;
    ok('process payment (' || v_status || ')', v_status = 'PAID|ONLINE');

    BEGIN
        medicare_pkg.pr_process_payment(v_appt);
        expect('paying twice rejected', -20008, 0, NULL);
    EXCEPTION WHEN OTHERS THEN expect('paying twice rejected', -20008, SQLCODE, SQLERRM);
    END;

    medicare_pkg.pr_cancel_appointment(v_appt);
    SELECT a.status || '|' || p.payment_status INTO v_status
    FROM   appointment a JOIN payment p ON p.appointment_id = a.appointment_id
    WHERE  a.appointment_id = v_appt;
    ok('cancel paid appointment -> refund (' || v_status || ')', v_status = 'CANCELLED|REFUNDED');

    SELECT COUNT(*) INTO v_count FROM appointment_audit WHERE appointment_id = v_appt;
    ok('audit has BOOKED, CONFIRMED, CANCELLED rows (' || v_count || ')', v_count = 3);

    medicare_pkg.pr_cancel_appointment(v_appt2);
    SELECT COUNT(*) INTO v_count FROM payment WHERE appointment_id = v_appt2;
    ok('cancel unpaid appointment removes pending payment', v_count = 0);

    BEGIN
        medicare_pkg.pr_cancel_appointment(v_appt);
        expect('cancelling twice rejected', -20007, 0, NULL);
    EXCEPTION WHEN OTHERS THEN expect('cancelling twice rejected', -20007, SQLCODE, SQLERRM);
    END;

    BEGIN
        UPDATE appointment SET status = 'BOOKED' WHERE appointment_id = v_appt;
        expect('CANCELLED -> BOOKED blocked by trigger', -20007, 0, NULL);
    EXCEPTION WHEN OTHERS THEN expect('CANCELLED -> BOOKED blocked by trigger', -20007, SQLCODE, SQLERRM);
    END;

    DBMS_OUTPUT.PUT_LINE('========== CONSULTATION ==========');
    -- book a session that runs today so the consultation can be recorded
    SELECT MIN(s.schedule_id) INTO v_sched
    FROM   doctor_schedule s JOIN doctor d ON d.doctor_id = s.doctor_id
    WHERE  d.status = 'ACTIVE' AND d.specialization_id <> 5
    AND    s.day_of_week = TO_CHAR(SYSDATE, 'DY', 'NLS_DATE_LANGUAGE=ENGLISH');
    medicare_pkg.pr_book_appointment(v_patient, v_sched, TRUNC(SYSDATE), 'CASH', NULL, v_appt, v_queue);

    BEGIN
        medicare_pkg.pr_book_appointment(v_patient, 1, next_session(1, 2), 'CASH', NULL, v_appt2, v_queue);
        medicare_pkg.pr_record_consultation(v_appt2, 'x', 'y', NULL, NULL, v_cons);
        expect('consultation before appointment date rejected', -20009, 0, NULL);
    EXCEPTION WHEN OTHERS THEN expect('consultation before appointment date rejected', -20009, SQLCODE, SQLERRM);
    END;

    medicare_pkg.pr_record_consultation(v_appt, 'Fever and headache for 2 days', 'Viral fever',
                                        'Advised rest and fluids', TRUNC(SYSDATE) + 7, v_cons);
    SELECT status INTO v_status FROM appointment WHERE appointment_id = v_appt;
    ok('record consultation completes appointment', v_status = 'COMPLETED');

    medicare_pkg.pr_add_prescription_item(v_cons, 'Paracetamol', '500 mg', 'Three times daily', 3, 'After meals', v_item);
    medicare_pkg.pr_add_prescription_item(v_cons, 'Vitamin C', '500 mg', 'Once daily', 7, NULL, v_item);
    SELECT COUNT(*) INTO v_count FROM prescription_item WHERE consultation_id = v_cons;
    ok('add prescription items', v_count = 2);

    BEGIN
        medicare_pkg.pr_add_prescription_item(-1, 'X', '1', '1', 1, NULL, v_item);
        expect('prescription for unknown consultation rejected', -20001, 0, NULL);
    EXCEPTION WHEN OTHERS THEN expect('prescription for unknown consultation rejected', -20001, SQLCODE, SQLERRM);
    END;

    BEGIN
        medicare_pkg.pr_add_prescription_item(v_cons, 'X', '1', '1', 0, NULL, v_item);
        expect('prescription with 0 days rejected', -20011, 0, NULL);
    EXCEPTION WHEN OTHERS THEN expect('prescription with 0 days rejected', -20011, SQLCODE, SQLERRM);
    END;

    BEGIN
        medicare_pkg.pr_record_consultation(v_appt, 'x', 'y', NULL, NULL, v_cons);
        expect('second consultation rejected', -20009, 0, NULL);
    EXCEPTION WHEN OTHERS THEN expect('second consultation rejected', -20009, SQLCODE, SQLERRM);
    END;

    DBMS_OUTPUT.PUT_LINE('========== NO-SHOW JOB PROCEDURE ==========');
    -- create an overdue BOOKED appointment directly (the procedure forbids past dates)
    v_date := next_session(1) - 7;
    INSERT INTO appointment (patient_id, schedule_id, appointment_date, queue_no, status)
    VALUES (v_patient, 1, v_date, 50, 'BOOKED')
    RETURNING appointment_id INTO v_appt;
    medicare_pkg.pr_mark_past_no_shows(v_count);
    SELECT status INTO v_status FROM appointment WHERE appointment_id = v_appt;
    ok('pr_mark_past_no_shows marked overdue appointment', v_count >= 1 AND v_status = 'NO_SHOW');

    DBMS_OUTPUT.PUT_LINE('========== REPORT PARAMETER CHECKS ==========');
    BEGIN
        medicare_reports.print_doctor_performance(DATE '2026-12-31', DATE '2026-01-01');
        expect('report with reversed dates rejected', -20012, 0, NULL);
    EXCEPTION WHEN OTHERS THEN expect('report with reversed dates rejected', -20012, SQLCODE, SQLERRM);
    END;
    BEGIN
        medicare_reports.print_patient_history(-1);
        expect('history for unknown patient rejected', -20001, 0, NULL);
    EXCEPTION WHEN OTHERS THEN expect('history for unknown patient rejected', -20001, SQLCODE, SQLERRM);
    END;

    DBMS_OUTPUT.PUT_LINE('');
    DBMS_OUTPUT.PUT_LINE('RESULT: ' || v_passed || ' passed, ' || v_failed || ' failed');
    DBMS_SESSION.CLEAR_IDENTIFIER;
END;
/

ROLLBACK;

-- ---------------------------------------------------------------------
--  Business reports on the sample data
-- ---------------------------------------------------------------------
EXEC DBMS_MVIEW.REFRESH('MV_MONTHLY_REVENUE', 'C')
EXEC medicare_reports.print_monthly_revenue(2026)
EXEC medicare_reports.print_doctor_performance(DATE '2026-07-01', DATE '2026-10-31')
EXEC medicare_reports.print_specialization_demand(DATE '2026-07-01', DATE '2026-11-30')
EXEC medicare_reports.print_session_occupancy(TRUNC(SYSDATE), TRUNC(SYSDATE) + 6)
EXEC medicare_reports.print_patient_history(2)
EXEC medicare_reports.print_outstanding_payments
EXEC medicare_reports.print_followups_due(30)

PROMPT
PROMPT Scheduler jobs:
COLUMN job_name FORMAT A25
COLUMN repeat_interval FORMAT A45
COLUMN next_run FORMAT A20
SELECT job_name, enabled, state, repeat_interval, TO_CHAR(next_run_date, 'YYYY-MM-DD HH24:MI') AS next_run
FROM   user_scheduler_jobs ORDER BY job_name;

PROMPT Errors logged by exception handlers during this test run:
COLUMN source FORMAT A40
COLUMN error_message FORMAT A90
SELECT source, error_code, SUBSTR(error_message, 1, 90) AS error_message
FROM   error_log
WHERE  logged_at > SYSTIMESTAMP - INTERVAL '5' MINUTE
ORDER BY log_id;
