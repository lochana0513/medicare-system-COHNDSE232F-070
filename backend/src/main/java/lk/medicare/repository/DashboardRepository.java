package lk.medicare.repository;

import lk.medicare.repository.support.OracleJdbcSupport;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Map;

@Repository
public class DashboardRepository {

    private final OracleJdbcSupport oracle;

    public DashboardRepository(OracleJdbcSupport oracle) {
        this.oracle = oracle;
    }

    public Map<String, Object> summary() {
        return oracle.queryForRow("""
                SELECT (SELECT COUNT(*) FROM patient)                                  AS total_patients,
                       (SELECT COUNT(*) FROM doctor WHERE status = 'ACTIVE')           AS active_doctors,
                       (SELECT COUNT(*) FROM hospital)                                 AS hospitals,
                       (SELECT COUNT(*) FROM appointment
                        WHERE  appointment_date = TRUNC(SYSDATE) AND status <> 'CANCELLED') AS today_appointments,
                       (SELECT COUNT(*) FROM appointment
                        WHERE  appointment_date > TRUNC(SYSDATE)
                        AND    status IN ('BOOKED', 'CONFIRMED'))                      AS upcoming_appointments,
                       (SELECT NVL(SUM(amount), 0) FROM payment
                        WHERE  payment_status = 'PAID'
                        AND    payment_date >= TRUNC(SYSDATE, 'MM'))                   AS revenue_this_month,
                       (SELECT NVL(SUM(p.amount), 0)
                        FROM   payment p JOIN appointment a ON a.appointment_id = p.appointment_id
                        WHERE  p.payment_status IN ('PENDING', 'FAILED')
                        AND    a.status IN ('BOOKED', 'CONFIRMED'))                    AS outstanding_amount
                FROM   dual
                """);
    }

    /** Appointment count per status for the current month. */
    public List<Map<String, Object>> statusThisMonth() {
        return oracle.queryForRows("""
                SELECT status, COUNT(*) AS total
                FROM   appointment
                WHERE  appointment_date >= TRUNC(SYSDATE, 'MM')
                AND    appointment_date <  ADD_MONTHS(TRUNC(SYSDATE, 'MM'), 1)
                GROUP BY status
                ORDER BY status
                """);
    }

    /** Paid revenue per appointment month for the last six months. */
    public List<Map<String, Object>> revenueTrend() {
        return oracle.queryForRows("""
                SELECT TO_CHAR(TRUNC(a.appointment_date, 'MM'), 'YYYY-MM') AS month,
                       COUNT(*)                                            AS appointments,
                       NVL(SUM(CASE WHEN p.payment_status = 'PAID' THEN p.amount END), 0) AS revenue
                FROM   appointment a
                LEFT JOIN payment p ON p.appointment_id = a.appointment_id
                WHERE  a.appointment_date >= ADD_MONTHS(TRUNC(SYSDATE, 'MM'), -5)
                GROUP BY TRUNC(a.appointment_date, 'MM')
                ORDER BY TRUNC(a.appointment_date, 'MM')
                """);
    }
}
