package lk.medicare.repository;

import lk.medicare.repository.support.OracleJdbcSupport;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

/** Business reports from the MEDICARE_REPORTS package (each function returns a SYS_REFCURSOR). */
@Repository
public class ReportRepository {

    private final JdbcTemplate jdbc;
    private final OracleJdbcSupport oracle;

    public ReportRepository(JdbcTemplate jdbc, OracleJdbcSupport oracle) {
        this.jdbc = jdbc;
        this.oracle = oracle;
    }

    public List<Map<String, Object>> monthlyRevenue(int year) {
        return oracle.queryRefCursor("medicare_reports.rpt_monthly_revenue", year);
    }

    public List<Map<String, Object>> doctorPerformance(LocalDate from, LocalDate to) {
        return oracle.queryRefCursor("medicare_reports.rpt_doctor_performance", from, to);
    }

    public List<Map<String, Object>> specializationDemand(LocalDate from, LocalDate to) {
        return oracle.queryRefCursor("medicare_reports.rpt_specialization_demand", from, to);
    }

    public List<Map<String, Object>> sessionOccupancy(LocalDate from, LocalDate to) {
        return oracle.queryRefCursor("medicare_reports.rpt_session_occupancy", from, to);
    }

    public List<Map<String, Object>> patientHistory(long patientId) {
        return oracle.queryRefCursor("medicare_reports.rpt_patient_history", patientId);
    }

    public List<Map<String, Object>> outstandingPayments() {
        return oracle.queryRefCursor("medicare_reports.rpt_outstanding_payments");
    }

    public List<Map<String, Object>> followupsDue(int days) {
        return oracle.queryRefCursor("medicare_reports.rpt_followups_due", days);
    }

    /** Complete refresh of MV_MONTHLY_REVENUE (also run nightly by JOB_REFRESH_REVENUE_MV). */
    public void refreshRevenueView() {
        jdbc.update("BEGIN DBMS_MVIEW.REFRESH('MV_MONTHLY_REVENUE', 'C'); END;");
    }
}
