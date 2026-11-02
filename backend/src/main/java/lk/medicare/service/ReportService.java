package lk.medicare.service;

import lk.medicare.repository.DashboardRepository;
import lk.medicare.repository.ReportRepository;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
public class ReportService {

    private final ReportRepository reports;
    private final DashboardRepository dashboard;

    public ReportService(ReportRepository reports, DashboardRepository dashboard) {
        this.reports = reports;
        this.dashboard = dashboard;
    }

    public Map<String, Object> dashboard() {
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("summary", dashboard.summary());
        result.put("statusThisMonth", dashboard.statusThisMonth());
        result.put("revenueTrend", dashboard.revenueTrend());
        return result;
    }

    public List<Map<String, Object>> monthlyRevenue(int year, boolean refresh) {
        if (refresh) {
            reports.refreshRevenueView();
        }
        return reports.monthlyRevenue(year);
    }

    public List<Map<String, Object>> doctorPerformance(LocalDate from, LocalDate to) {
        return reports.doctorPerformance(from, to);
    }

    public List<Map<String, Object>> specializationDemand(LocalDate from, LocalDate to) {
        return reports.specializationDemand(from, to);
    }

    public List<Map<String, Object>> sessionOccupancy(LocalDate from, LocalDate to) {
        return reports.sessionOccupancy(from, to);
    }

    public List<Map<String, Object>> patientHistory(long patientId) {
        return reports.patientHistory(patientId);
    }

    public List<Map<String, Object>> outstandingPayments() {
        return reports.outstandingPayments();
    }

    public List<Map<String, Object>> followupsDue(int days) {
        return reports.followupsDue(days);
    }
}
