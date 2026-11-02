-- =====================================================================
--  MediCare Appointment Management System
--  06_reports_pkg.sql  -  Business reports
--
--  Each report has two entry points:
--    RPT_*   function returning a SYS_REFCURSOR (used by the web app)
--    PRINT_* procedure that fetches the same cursor and prints a
--            formatted report with DBMS_OUTPUT (SET SERVEROUTPUT ON)
--
--  1. Monthly revenue by hospital       5. Patient medical history
--  2. Doctor performance                6. Outstanding payments
--  3. Specialization demand             7. Follow-ups due
--  4. Session occupancy (upcoming)
-- =====================================================================

CREATE OR REPLACE PACKAGE medicare_reports AS

    FUNCTION rpt_monthly_revenue       (p_year IN NUMBER) RETURN SYS_REFCURSOR;
    FUNCTION rpt_doctor_performance    (p_from IN DATE, p_to IN DATE) RETURN SYS_REFCURSOR;
    FUNCTION rpt_specialization_demand (p_from IN DATE, p_to IN DATE) RETURN SYS_REFCURSOR;
    FUNCTION rpt_session_occupancy     (p_from IN DATE, p_to IN DATE) RETURN SYS_REFCURSOR;
    FUNCTION rpt_patient_history       (p_patient_id IN NUMBER) RETURN SYS_REFCURSOR;
    FUNCTION rpt_outstanding_payments  RETURN SYS_REFCURSOR;
    FUNCTION rpt_followups_due         (p_days IN NUMBER DEFAULT 14) RETURN SYS_REFCURSOR;

    PROCEDURE print_monthly_revenue       (p_year IN NUMBER);
    PROCEDURE print_doctor_performance    (p_from IN DATE, p_to IN DATE);
    PROCEDURE print_specialization_demand (p_from IN DATE, p_to IN DATE);
    PROCEDURE print_session_occupancy     (p_from IN DATE, p_to IN DATE);
    PROCEDURE print_patient_history       (p_patient_id IN NUMBER);
    PROCEDURE print_outstanding_payments;
    PROCEDURE print_followups_due         (p_days IN NUMBER DEFAULT 14);

END medicare_reports;
/

CREATE OR REPLACE PACKAGE BODY medicare_reports AS

    c_width CONSTANT PLS_INTEGER := 110;

    -- -----------------------------------------------------------------
    --  Output helpers
    -- -----------------------------------------------------------------
    PROCEDURE p (p_text IN VARCHAR2) IS
    BEGIN
        DBMS_OUTPUT.PUT_LINE(p_text);
    END p;

    PROCEDURE title (p_text IN VARCHAR2, p_subtitle IN VARCHAR2 DEFAULT NULL) IS
    BEGIN
        p(RPAD('=', c_width, '='));
        p(' MEDICARE | ' || p_text);
        IF p_subtitle IS NOT NULL THEN p(' ' || p_subtitle); END IF;
        p(' Generated: ' || TO_CHAR(SYSDATE, 'YYYY-MM-DD HH24:MI'));
        p(RPAD('=', c_width, '='));
    END title;

    PROCEDURE rule IS
    BEGIN
        p(RPAD('-', c_width, '-'));
    END rule;

    FUNCTION money (p_amount IN NUMBER) RETURN VARCHAR2 IS
    BEGIN
        RETURN TRIM(TO_CHAR(NVL(p_amount, 0), '9,999,990.00'));
    END money;

    PROCEDURE check_range (p_from IN DATE, p_to IN DATE) IS
    BEGIN
        IF p_from IS NULL OR p_to IS NULL OR p_from > p_to THEN
            RAISE_APPLICATION_ERROR(-20012, 'Invalid date range: from date must be on or before to date');
        END IF;
    END check_range;

    -- =================================================================
    --  1. Monthly revenue by hospital (from MV_MONTHLY_REVENUE)
    -- =================================================================
    FUNCTION rpt_monthly_revenue (p_year IN NUMBER) RETURN SYS_REFCURSOR IS
        rc SYS_REFCURSOR;
    BEGIN
        OPEN rc FOR
            SELECT TO_CHAR(month_start, 'YYYY-MM') AS month,
                   hospital_name,
                   total_appointments,
                   completed_appointments,
                   paid_revenue,
                   refunded_amount
            FROM   mv_monthly_revenue
            WHERE  EXTRACT(YEAR FROM month_start) = p_year
            ORDER BY month_start, hospital_name;
        RETURN rc;
    END rpt_monthly_revenue;

    PROCEDURE print_monthly_revenue (p_year IN NUMBER) IS
        TYPE t_row IS RECORD (
            month       VARCHAR2(7),
            hospital_name    VARCHAR2(100),
            total       NUMBER,
            completed   NUMBER,
            revenue     NUMBER,
            refunded    NUMBER);
        rc          SYS_REFCURSOR;
        r           t_row;
        v_prev      VARCHAR2(7);
        v_month_rev NUMBER := 0;
        v_grand_rev NUMBER := 0;
        v_grand_ref NUMBER := 0;
    BEGIN
        title('MONTHLY REVENUE BY HOSPITAL', 'Year: ' || p_year);
        p(RPAD('Month', 9) || RPAD('Hospital', 30) || LPAD('Appts', 7) || LPAD('Completed', 11) ||
          LPAD('Revenue (LKR)', 16) || LPAD('Refunded (LKR)', 16));
        rule;

        rc := rpt_monthly_revenue(p_year);
        LOOP
            FETCH rc INTO r;
            EXIT WHEN rc%NOTFOUND;

            -- control break: print a subtotal whenever the month changes
            IF v_prev IS NOT NULL AND r.month <> v_prev THEN
                p(LPAD('Subtotal ' || v_prev || ':', 57) || LPAD(money(v_month_rev), 16));
                p('');
                v_month_rev := 0;
            END IF;

            p(RPAD(CASE WHEN r.month = v_prev THEN ' ' ELSE r.month END, 9) ||
              RPAD(r.hospital_name, 30) || LPAD(r.total, 7) || LPAD(r.completed, 11) ||
              LPAD(money(r.revenue), 16) || LPAD(money(r.refunded), 16));

            v_prev      := r.month;
            v_month_rev := v_month_rev + r.revenue;
            v_grand_rev := v_grand_rev + r.revenue;
            v_grand_ref := v_grand_ref + r.refunded;
        END LOOP;
        CLOSE rc;

        IF v_prev IS NULL THEN
            p('No appointments found for ' || p_year);
        ELSE
            p(LPAD('Subtotal ' || v_prev || ':', 57) || LPAD(money(v_month_rev), 16));
            rule;
            p(LPAD('TOTAL ' || p_year || ':', 57) || LPAD(money(v_grand_rev), 16) || LPAD(money(v_grand_ref), 16));
        END IF;
    EXCEPTION
        WHEN OTHERS THEN
            IF rc%ISOPEN THEN CLOSE rc; END IF;
            medicare_pkg.log_error('MEDICARE_REPORTS.PRINT_MONTHLY_REVENUE', SQLCODE, SQLERRM);
            RAISE;
    END print_monthly_revenue;

    -- =================================================================
    --  2. Doctor performance
    -- =================================================================
    FUNCTION rpt_doctor_performance (p_from IN DATE, p_to IN DATE) RETURN SYS_REFCURSOR IS
        rc SYS_REFCURSOR;
    BEGIN
        check_range(p_from, p_to);
        OPEN rc FOR
            WITH stats AS (
                SELECT d.doctor_id,
                       'Dr. ' || d.first_name || ' ' || d.last_name                   AS doctor_name,
                       sp.name                                                        AS specialization,
                       COUNT(a.appointment_id)                                        AS total_appointments,
                       COUNT(CASE WHEN a.status = 'COMPLETED' THEN 1 END)             AS completed,
                       COUNT(CASE WHEN a.status = 'CANCELLED' THEN 1 END)             AS cancelled,
                       COUNT(CASE WHEN a.status = 'NO_SHOW'   THEN 1 END)             AS no_shows,
                       NVL(SUM(CASE WHEN p.payment_status = 'PAID' THEN p.amount END), 0) AS revenue
                FROM   doctor d
                JOIN   specialization  sp ON sp.specialization_id = d.specialization_id
                LEFT JOIN doctor_schedule s ON s.doctor_id = d.doctor_id
                LEFT JOIN appointment     a ON a.schedule_id = s.schedule_id
                                           AND a.appointment_date BETWEEN TRUNC(p_from) AND TRUNC(p_to)
                LEFT JOIN payment         p ON p.appointment_id = a.appointment_id
                GROUP BY d.doctor_id, d.first_name, d.last_name, sp.name)
            SELECT doctor_id, doctor_name, specialization, total_appointments, completed, cancelled, no_shows,
                   ROUND(100 * completed / NULLIF(completed + no_shows, 0), 1) AS completion_rate,
                   revenue,
                   RANK() OVER (ORDER BY revenue DESC)                        AS revenue_rank
            FROM   stats
            ORDER BY revenue_rank, doctor_name;
        RETURN rc;
    END rpt_doctor_performance;

    PROCEDURE print_doctor_performance (p_from IN DATE, p_to IN DATE) IS
        TYPE t_row IS RECORD (
            doctor_id       NUMBER,
            doctor_name     VARCHAR2(120),
            spec_name  VARCHAR2(60),
            total           NUMBER,
            completed       NUMBER,
            cancelled       NUMBER,
            no_shows        NUMBER,
            completion_rate NUMBER,
            revenue         NUMBER,
            revenue_rank    NUMBER);
        rc      SYS_REFCURSOR;
        r       t_row;
        v_total NUMBER := 0;
    BEGIN
        rc := rpt_doctor_performance(p_from, p_to);
        title('DOCTOR PERFORMANCE', 'Period: ' || TO_CHAR(p_from, 'YYYY-MM-DD') || ' to ' || TO_CHAR(p_to, 'YYYY-MM-DD'));
        p(RPAD('Rank', 5) || RPAD('Doctor', 28) || RPAD('Specialization', 26) || LPAD('Appts', 6) ||
          LPAD('Done', 6) || LPAD('Canc', 6) || LPAD('NoSh', 6) || LPAD('Rate%', 7) || LPAD('Revenue', 16));
        rule;
        LOOP
            FETCH rc INTO r;
            EXIT WHEN rc%NOTFOUND;
            p(RPAD(r.revenue_rank, 5) || RPAD(r.doctor_name, 28) || RPAD(r.spec_name, 26) ||
              LPAD(r.total, 6) || LPAD(r.completed, 6) || LPAD(r.cancelled, 6) || LPAD(r.no_shows, 6) ||
              LPAD(NVL(TO_CHAR(r.completion_rate, '990.0'), '-'), 7) || LPAD(money(r.revenue), 16));
            v_total := v_total + r.revenue;
        END LOOP;
        rule;
        p(rc%ROWCOUNT || ' doctors' || LPAD('TOTAL REVENUE:', 79) || LPAD(money(v_total), 16));
        CLOSE rc;
    EXCEPTION
        WHEN OTHERS THEN
            IF rc%ISOPEN THEN CLOSE rc; END IF;
            medicare_pkg.log_error('MEDICARE_REPORTS.PRINT_DOCTOR_PERFORMANCE', SQLCODE, SQLERRM);
            RAISE;
    END print_doctor_performance;

    -- =================================================================
    --  3. Specialization demand
    -- =================================================================
    FUNCTION rpt_specialization_demand (p_from IN DATE, p_to IN DATE) RETURN SYS_REFCURSOR IS
        rc SYS_REFCURSOR;
    BEGIN
        check_range(p_from, p_to);
        OPEN rc FOR
            WITH demand AS (
                SELECT sp.name                                                         AS specialization,
                       COUNT(DISTINCT d.doctor_id)                                     AS doctors,
                       COUNT(a.appointment_id)                                         AS appointments,
                       COUNT(DISTINCT a.patient_id)                                    AS unique_patients,
                       COUNT(CASE WHEN a.status = 'CANCELLED' THEN 1 END)              AS cancelled,
                       NVL(SUM(CASE WHEN p.payment_status = 'PAID' THEN p.amount END), 0) AS revenue
                FROM   specialization sp
                LEFT JOIN doctor          d ON d.specialization_id = sp.specialization_id
                LEFT JOIN doctor_schedule s ON s.doctor_id = d.doctor_id
                LEFT JOIN appointment     a ON a.schedule_id = s.schedule_id
                                           AND a.appointment_date BETWEEN TRUNC(p_from) AND TRUNC(p_to)
                LEFT JOIN payment         p ON p.appointment_id = a.appointment_id
                GROUP BY sp.name)
            SELECT specialization, doctors, appointments, unique_patients, cancelled, revenue,
                   ROUND(100 * appointments / NULLIF(SUM(appointments) OVER (), 0), 1) AS share_pct
            FROM   demand
            ORDER BY appointments DESC, specialization;
        RETURN rc;
    END rpt_specialization_demand;

    PROCEDURE print_specialization_demand (p_from IN DATE, p_to IN DATE) IS
        TYPE t_row IS RECORD (
            spec_name  VARCHAR2(60),
            doctors         NUMBER,
            appointments    NUMBER,
            unique_patients NUMBER,
            cancelled       NUMBER,
            revenue         NUMBER,
            share_pct       NUMBER);
        rc SYS_REFCURSOR;
        r  t_row;
    BEGIN
        rc := rpt_specialization_demand(p_from, p_to);
        title('SPECIALIZATION DEMAND', 'Period: ' || TO_CHAR(p_from, 'YYYY-MM-DD') || ' to ' || TO_CHAR(p_to, 'YYYY-MM-DD'));
        p(RPAD('Specialization', 28) || LPAD('Doctors', 8) || LPAD('Appts', 7) || LPAD('Patients', 10) ||
          LPAD('Cancelled', 11) || LPAD('Revenue', 16) || LPAD('Share', 8) || '  Demand');
        rule;
        LOOP
            FETCH rc INTO r;
            EXIT WHEN rc%NOTFOUND;
            p(RPAD(r.spec_name, 28) || LPAD(r.doctors, 8) || LPAD(r.appointments, 7) ||
              LPAD(r.unique_patients, 10) || LPAD(r.cancelled, 11) || LPAD(money(r.revenue), 16) ||
              LPAD(NVL(TO_CHAR(r.share_pct, '990.0'), '0.0') || '%', 8) || '  ' ||
              RPAD('#', ROUND(NVL(r.share_pct, 0) / 2), '#'));
        END LOOP;
        CLOSE rc;
    EXCEPTION
        WHEN OTHERS THEN
            IF rc%ISOPEN THEN CLOSE rc; END IF;
            medicare_pkg.log_error('MEDICARE_REPORTS.PRINT_SPECIALIZATION_DEMAND', SQLCODE, SQLERRM);
            RAISE;
    END print_specialization_demand;

    -- =================================================================
    --  4. Session occupancy: every session in the range, booked vs capacity
    -- =================================================================
    FUNCTION rpt_session_occupancy (p_from IN DATE, p_to IN DATE) RETURN SYS_REFCURSOR IS
        rc SYS_REFCURSOR;
    BEGIN
        check_range(p_from, p_to);
        IF p_to - p_from > 92 THEN
            RAISE_APPLICATION_ERROR(-20012, 'Session occupancy range cannot exceed 92 days');
        END IF;
        OPEN rc FOR
            WITH days AS (
                SELECT TRUNC(p_from) + LEVEL - 1 AS session_date
                FROM   dual
                CONNECT BY LEVEL <= TRUNC(p_to) - TRUNC(p_from) + 1),
            sessions AS (
                SELECT dy.session_date,
                       s.schedule_id,
                       'Dr. ' || d.first_name || ' ' || d.last_name AS doctor_name,
                       sp.name                                      AS specialization,
                       h.name                                       AS hospital_name,
                       s.start_time || '-' || s.end_time            AS session_time,
                       s.max_patients,
                       medicare_pkg.fn_available_slots(s.schedule_id, dy.session_date) AS available
                FROM   days dy
                JOIN   doctor_schedule s  ON s.day_of_week = TO_CHAR(dy.session_date, 'DY', 'NLS_DATE_LANGUAGE=ENGLISH')
                JOIN   doctor          d  ON d.doctor_id = s.doctor_id AND d.status = 'ACTIVE'
                JOIN   specialization  sp ON sp.specialization_id = d.specialization_id
                JOIN   hospital        h  ON h.hospital_id = s.hospital_id)
            SELECT session_date, schedule_id, doctor_name, specialization, hospital_name, session_time,
                   max_patients, max_patients - available AS booked, available,
                   ROUND(100 * (max_patients - available) / max_patients, 1) AS occupancy_pct
            FROM   sessions
            ORDER BY session_date, session_time, doctor_name;
        RETURN rc;
    END rpt_session_occupancy;

    PROCEDURE print_session_occupancy (p_from IN DATE, p_to IN DATE) IS
        TYPE t_row IS RECORD (
            session_date  DATE,
            schedule_id   NUMBER,
            doctor_name   VARCHAR2(120),
            spec_name VARCHAR2(60),
            hospital_name hospital.name%TYPE,
            session_time  VARCHAR2(11),
            max_patients  NUMBER,
            booked        NUMBER,
            available     NUMBER,
            occupancy_pct NUMBER);
        rc       SYS_REFCURSOR;
        r        t_row;
        v_booked NUMBER := 0;
        v_cap    NUMBER := 0;
    BEGIN
        rc := rpt_session_occupancy(p_from, p_to);
        title('SESSION OCCUPANCY', 'Period: ' || TO_CHAR(p_from, 'YYYY-MM-DD') || ' to ' || TO_CHAR(p_to, 'YYYY-MM-DD'));
        p(RPAD('Date', 15) || RPAD('Time', 12) || RPAD('Doctor', 27) || RPAD('Hospital', 27) ||
          LPAD('Booked', 7) || LPAD('Max', 5) || LPAD('Free', 6) || LPAD('Occ%', 7));
        rule;
        LOOP
            FETCH rc INTO r;
            EXIT WHEN rc%NOTFOUND;
            p(RPAD(TO_CHAR(r.session_date, 'YYYY-MM-DD DY', 'NLS_DATE_LANGUAGE=ENGLISH'), 15) ||
              RPAD(r.session_time, 12) || RPAD(r.doctor_name, 27) || RPAD(r.hospital_name, 27) ||
              LPAD(r.booked, 7) || LPAD(r.max_patients, 5) || LPAD(r.available, 6) ||
              LPAD(TO_CHAR(r.occupancy_pct, '990.0'), 7) ||
              CASE WHEN r.available = 0 THEN '  FULL' WHEN r.occupancy_pct >= 80 THEN '  ALMOST FULL' END);
            v_booked := v_booked + r.booked;
            v_cap    := v_cap + r.max_patients;
        END LOOP;
        rule;
        p(rc%ROWCOUNT || ' sessions, ' || v_booked || ' of ' || v_cap || ' slots booked (' ||
          NVL(TO_CHAR(ROUND(100 * v_booked / NULLIF(v_cap, 0), 1), 'FM990.0'), '0') || '% overall)');
        CLOSE rc;
    EXCEPTION
        WHEN OTHERS THEN
            IF rc%ISOPEN THEN CLOSE rc; END IF;
            medicare_pkg.log_error('MEDICARE_REPORTS.PRINT_SESSION_OCCUPANCY', SQLCODE, SQLERRM);
            RAISE;
    END print_session_occupancy;

    -- =================================================================
    --  5. Patient medical history
    -- =================================================================
    FUNCTION rpt_patient_history (p_patient_id IN NUMBER) RETURN SYS_REFCURSOR IS
        rc SYS_REFCURSOR;
    BEGIN
        OPEN rc FOR
            SELECT c.consultation_id,
                   c.consultation_date,
                   'Dr. ' || d.first_name || ' ' || d.last_name AS doctor_name,
                   sp.name                                      AS specialization,
                   h.name                                       AS hospital_name,
                   c.symptoms,
                   c.diagnosis,
                   c.notes,
                   c.follow_up_date,
                   (SELECT LISTAGG(pi.medicine_name || ' ' || pi.dosage || ', ' || pi.frequency ||
                                   ' x ' || pi.duration_days || 'd', '; ') WITHIN GROUP (ORDER BY pi.item_id)
                    FROM   prescription_item pi
                    WHERE  pi.consultation_id = c.consultation_id) AS medicines
            FROM   consultation c
            JOIN   appointment     a  ON a.appointment_id = c.appointment_id
            JOIN   doctor_schedule s  ON s.schedule_id = a.schedule_id
            JOIN   doctor          d  ON d.doctor_id = s.doctor_id
            JOIN   specialization  sp ON sp.specialization_id = d.specialization_id
            JOIN   hospital        h  ON h.hospital_id = s.hospital_id
            WHERE  a.patient_id = p_patient_id
            ORDER BY c.consultation_date DESC;
        RETURN rc;
    END rpt_patient_history;

    -- Uses nested explicit parameterised cursors (consultations -> items)
    PROCEDURE print_patient_history (p_patient_id IN NUMBER) IS
        CURSOR c_consultations (cp_patient_id NUMBER) IS
            SELECT c.consultation_id, c.consultation_date, c.symptoms, c.diagnosis, c.notes, c.follow_up_date,
                   'Dr. ' || d.first_name || ' ' || d.last_name AS doctor_name,
                   sp.name AS specialization,
                   h.name  AS hospital_name
            FROM   consultation c
            JOIN   appointment     a  ON a.appointment_id = c.appointment_id
            JOIN   doctor_schedule s  ON s.schedule_id = a.schedule_id
            JOIN   doctor          d  ON d.doctor_id = s.doctor_id
            JOIN   specialization  sp ON sp.specialization_id = d.specialization_id
            JOIN   hospital        h  ON h.hospital_id = s.hospital_id
            WHERE  a.patient_id = cp_patient_id
            ORDER BY c.consultation_date DESC;

        CURSOR c_items (cp_consultation_id NUMBER) IS
            SELECT medicine_name, dosage, frequency, duration_days, instructions
            FROM   prescription_item
            WHERE  consultation_id = cp_consultation_id
            ORDER BY item_id;

        v_patient patient%ROWTYPE;
        v_visits  PLS_INTEGER := 0;
        v_stats   VARCHAR2(200);
    BEGIN
        BEGIN
            SELECT * INTO v_patient FROM patient WHERE patient_id = p_patient_id;
        EXCEPTION
            WHEN NO_DATA_FOUND THEN
                RAISE_APPLICATION_ERROR(-20001, 'Patient ' || p_patient_id || ' not found');
        END;

        SELECT COUNT(*) || ' appointments (' ||
               COUNT(CASE WHEN status = 'COMPLETED' THEN 1 END) || ' completed, ' ||
               COUNT(CASE WHEN status = 'CANCELLED' THEN 1 END) || ' cancelled, ' ||
               COUNT(CASE WHEN status = 'NO_SHOW'   THEN 1 END) || ' no-show, ' ||
               COUNT(CASE WHEN status IN ('BOOKED', 'CONFIRMED') THEN 1 END) || ' upcoming)'
        INTO   v_stats
        FROM   appointment WHERE patient_id = p_patient_id;

        title('PATIENT MEDICAL HISTORY');
        p(' Patient : ' || v_patient.first_name || ' ' || v_patient.last_name || '  (ID ' || v_patient.patient_id || ')');
        p(' NIC     : ' || v_patient.nic || '   Age: ' || medicare_pkg.fn_patient_age(p_patient_id) ||
          '   Gender: ' || v_patient.gender || '   Blood group: ' || NVL(v_patient.blood_group, '-'));
        p(' Contact : ' || v_patient.phone || '   ' || NVL(v_patient.email, ''));
        p(' Visits  : ' || v_stats);
        rule;

        FOR c IN c_consultations(p_patient_id) LOOP
            v_visits := v_visits + 1;
            p(TO_CHAR(c.consultation_date, 'YYYY-MM-DD') || '  ' || c.doctor_name || ' (' || c.specialization ||
              ') at ' || c.hospital_name);
            p('   Symptoms : ' || NVL(c.symptoms, '-'));
            p('   Diagnosis: ' || c.diagnosis);
            IF c.notes IS NOT NULL THEN p('   Notes    : ' || c.notes); END IF;
            IF c.follow_up_date IS NOT NULL THEN
                p('   Follow-up: ' || TO_CHAR(c.follow_up_date, 'YYYY-MM-DD'));
            END IF;
            p('   Prescription:');
            FOR i IN c_items(c.consultation_id) LOOP
                p('     - ' || i.medicine_name || ' ' || i.dosage || ', ' || i.frequency || ', ' ||
                  i.duration_days || ' days' || CASE WHEN i.instructions IS NOT NULL THEN ' (' || i.instructions || ')' END);
            END LOOP;
            p('');
        END LOOP;

        IF v_visits = 0 THEN
            p('No consultations recorded for this patient.');
        END IF;
    EXCEPTION
        WHEN OTHERS THEN
            medicare_pkg.log_error('MEDICARE_REPORTS.PRINT_PATIENT_HISTORY', SQLCODE, SQLERRM);
            RAISE;
    END print_patient_history;

    -- =================================================================
    --  6. Outstanding payments for upcoming appointments
    -- =================================================================
    FUNCTION rpt_outstanding_payments RETURN SYS_REFCURSOR IS
        rc SYS_REFCURSOR;
    BEGIN
        OPEN rc FOR
            SELECT v.appointment_id,
                   v.appointment_date,
                   v.appointment_date - TRUNC(SYSDATE) AS days_until,
                   v.patient_name,
                   v.patient_phone,
                   v.doctor_name,
                   v.hospital_name,
                   v.amount,
                   v.payment_method,
                   v.payment_status
            FROM   v_appointment_details v
            WHERE  v.status IN ('BOOKED', 'CONFIRMED')
            AND    (v.payment_status IN ('PENDING', 'FAILED') OR v.payment_status IS NULL)
            ORDER BY v.appointment_date, v.appointment_id;
        RETURN rc;
    END rpt_outstanding_payments;

    PROCEDURE print_outstanding_payments IS
        TYPE t_row IS RECORD (
            appointment_id NUMBER,
            appointment_date DATE,
            days_until     NUMBER,
            patient_name   VARCHAR2(101),
            patient_phone  patient.phone%TYPE,
            doctor_name    VARCHAR2(120),
            hospital_name  hospital.name%TYPE,
            amount         NUMBER,
            payment_method payment.payment_method%TYPE,
            payment_status payment.payment_status%TYPE);
        rc      SYS_REFCURSOR;
        r       t_row;
        v_total NUMBER := 0;
    BEGIN
        rc := rpt_outstanding_payments;
        title('OUTSTANDING PAYMENTS', 'Upcoming appointments that are not yet paid');
        p(RPAD('Appt', 6) || RPAD('Date', 12) || LPAD('In', 4) || '  ' || RPAD('Patient', 22) || RPAD('Phone', 12) ||
          RPAD('Doctor', 27) || RPAD('Method', 8) || RPAD('Status', 9) || LPAD('Amount', 12));
        rule;
        LOOP
            FETCH rc INTO r;
            EXIT WHEN rc%NOTFOUND;
            p(RPAD(r.appointment_id, 6) || RPAD(TO_CHAR(r.appointment_date, 'YYYY-MM-DD'), 12) ||
              LPAD(r.days_until || 'd', 4) || '  ' || RPAD(r.patient_name, 22) || RPAD(r.patient_phone, 12) ||
              RPAD(r.doctor_name, 27) || RPAD(NVL(r.payment_method, '-'), 8) ||
              RPAD(NVL(r.payment_status, 'NONE'), 9) || LPAD(money(r.amount), 12));
            v_total := v_total + NVL(r.amount, 0);
        END LOOP;
        rule;
        p(rc%ROWCOUNT || ' unpaid appointment(s)' || LPAD('TOTAL OUTSTANDING:', 78) || LPAD(money(v_total), 12));
        CLOSE rc;
    EXCEPTION
        WHEN OTHERS THEN
            IF rc%ISOPEN THEN CLOSE rc; END IF;
            medicare_pkg.log_error('MEDICARE_REPORTS.PRINT_OUTSTANDING_PAYMENTS', SQLCODE, SQLERRM);
            RAISE;
    END print_outstanding_payments;

    -- =================================================================
    --  7. Follow-ups due in the next N days (and whether already booked)
    -- =================================================================
    FUNCTION rpt_followups_due (p_days IN NUMBER DEFAULT 14) RETURN SYS_REFCURSOR IS
        rc SYS_REFCURSOR;
    BEGIN
        IF p_days IS NULL OR p_days < 0 THEN
            RAISE_APPLICATION_ERROR(-20012, 'Number of days must be zero or more');
        END IF;
        OPEN rc FOR
            SELECT c.follow_up_date,
                   c.follow_up_date - TRUNC(SYSDATE)             AS days_until,
                   pt.first_name || ' ' || pt.last_name          AS patient_name,
                   pt.phone                                      AS patient_phone,
                   'Dr. ' || d.first_name || ' ' || d.last_name  AS doctor_name,
                   c.diagnosis,
                   CASE WHEN EXISTS (
                            SELECT 1
                            FROM   appointment a2
                            JOIN   doctor_schedule s2 ON s2.schedule_id = a2.schedule_id
                            WHERE  a2.patient_id = a.patient_id
                            AND    s2.doctor_id  = s.doctor_id
                            AND    a2.appointment_date > c.consultation_date
                            AND    a2.status <> 'CANCELLED')
                        THEN 'YES' ELSE 'NO' END                 AS already_booked
            FROM   consultation c
            JOIN   appointment     a  ON a.appointment_id = c.appointment_id
            JOIN   patient         pt ON pt.patient_id = a.patient_id
            JOIN   doctor_schedule s  ON s.schedule_id = a.schedule_id
            JOIN   doctor          d  ON d.doctor_id = s.doctor_id
            WHERE  c.follow_up_date BETWEEN TRUNC(SYSDATE) AND TRUNC(SYSDATE) + p_days
            ORDER BY c.follow_up_date, patient_name;
        RETURN rc;
    END rpt_followups_due;

    PROCEDURE print_followups_due (p_days IN NUMBER DEFAULT 14) IS
        TYPE t_row IS RECORD (
            follow_up_date DATE,
            days_until     NUMBER,
            patient_name   VARCHAR2(101),
            patient_phone  patient.phone%TYPE,
            doctor_name    VARCHAR2(120),
            diagnosis      consultation.diagnosis%TYPE,
            already_booked VARCHAR2(3));
        rc         SYS_REFCURSOR;
        r          t_row;
        v_to_call  PLS_INTEGER := 0;
    BEGIN
        rc := rpt_followups_due(p_days);
        title('FOLLOW-UPS DUE', 'Next ' || p_days || ' days - patients marked NO should be contacted');
        p(RPAD('Due', 12) || LPAD('In', 4) || '  ' || RPAD('Patient', 22) || RPAD('Phone', 12) ||
          RPAD('Doctor', 27) || RPAD('Diagnosis', 25) || 'Booked');
        rule;
        LOOP
            FETCH rc INTO r;
            EXIT WHEN rc%NOTFOUND;
            p(RPAD(TO_CHAR(r.follow_up_date, 'YYYY-MM-DD'), 12) || LPAD(r.days_until || 'd', 4) || '  ' ||
              RPAD(r.patient_name, 22) || RPAD(r.patient_phone, 12) || RPAD(r.doctor_name, 27) ||
              RPAD(SUBSTR(r.diagnosis, 1, 24), 25) || r.already_booked);
            IF r.already_booked = 'NO' THEN v_to_call := v_to_call + 1; END IF;
        END LOOP;
        rule;
        p(rc%ROWCOUNT || ' follow-up(s) due, ' || v_to_call || ' patient(s) still need to book');
        CLOSE rc;
    EXCEPTION
        WHEN OTHERS THEN
            IF rc%ISOPEN THEN CLOSE rc; END IF;
            medicare_pkg.log_error('MEDICARE_REPORTS.PRINT_FOLLOWUPS_DUE', SQLCODE, SQLERRM);
            RAISE;
    END print_followups_due;

END medicare_reports;
/

SHOW ERRORS PACKAGE BODY medicare_reports
