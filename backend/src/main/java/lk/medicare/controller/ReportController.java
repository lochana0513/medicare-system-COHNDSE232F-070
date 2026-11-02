package lk.medicare.controller;

import lk.medicare.service.ReportService;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api")
public class ReportController {

    private final ReportService service;

    public ReportController(ReportService service) {
        this.service = service;
    }

    @GetMapping("/dashboard")
    public Map<String, Object> dashboard() {
        return service.dashboard();
    }

    @GetMapping("/reports/monthly-revenue")
    public List<Map<String, Object>> monthlyRevenue(@RequestParam(required = false) Integer year,
                                                    @RequestParam(defaultValue = "true") boolean refresh) {
        return service.monthlyRevenue(year == null ? LocalDate.now().getYear() : year, refresh);
    }

    @GetMapping("/reports/doctor-performance")
    public List<Map<String, Object>> doctorPerformance(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        return service.doctorPerformance(from, to);
    }

    @GetMapping("/reports/specialization-demand")
    public List<Map<String, Object>> specializationDemand(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        return service.specializationDemand(from, to);
    }

    @GetMapping("/reports/session-occupancy")
    public List<Map<String, Object>> sessionOccupancy(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        LocalDate start = from == null ? LocalDate.now() : from;
        return service.sessionOccupancy(start, to == null ? start.plusDays(6) : to);
    }

    @GetMapping("/reports/patient-history/{patientId}")
    public List<Map<String, Object>> patientHistory(@PathVariable long patientId) {
        return service.patientHistory(patientId);
    }

    @GetMapping("/reports/outstanding-payments")
    public List<Map<String, Object>> outstandingPayments() {
        return service.outstandingPayments();
    }

    @GetMapping("/reports/followups-due")
    public List<Map<String, Object>> followupsDue(@RequestParam(defaultValue = "14") int days) {
        return service.followupsDue(days);
    }
}
