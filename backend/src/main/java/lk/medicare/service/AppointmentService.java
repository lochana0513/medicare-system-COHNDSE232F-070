package lk.medicare.service;

import lk.medicare.dto.Appointment;
import lk.medicare.dto.AuditEntry;
import lk.medicare.dto.BookAppointmentRequest;
import lk.medicare.exception.NotFoundException;
import lk.medicare.repository.AppointmentRepository;
import lk.medicare.repository.support.OracleJdbcSupport;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * Appointment workflow. The business rules live in MEDICARE_PKG; every state change
 * runs with the caller's name as client identifier so APPOINTMENT_AUDIT records who did it.
 */
@Service
public class AppointmentService {

    private final AppointmentRepository repository;
    private final OracleJdbcSupport oracle;

    public AppointmentService(AppointmentRepository repository, OracleJdbcSupport oracle) {
        this.repository = repository;
        this.oracle = oracle;
    }

    public List<Appointment> findAll(AppointmentRepository.Filter filter) {
        return repository.findAll(filter);
    }

    public Appointment get(long id) {
        return repository.findById(id).orElseThrow(() -> new NotFoundException("Appointment", id));
    }

    public List<AuditEntry> audit(long id) {
        get(id);
        return repository.findAudit(id);
    }

    @Transactional
    public Appointment book(BookAppointmentRequest request, String user) {
        long id = oracle.asUser(user, () -> repository.book(request));
        return get(id);
    }

    @Transactional
    public Appointment confirm(long id, String user) {
        oracle.runAsUser(user, () -> repository.confirm(id));
        return get(id);
    }

    @Transactional
    public Appointment cancel(long id, String user) {
        oracle.runAsUser(user, () -> repository.cancel(id));
        return get(id);
    }

    @Transactional
    public Appointment pay(long id, String method, String user) {
        oracle.runAsUser(user, () -> repository.processPayment(id, method));
        return get(id);
    }

    @Transactional
    public int markPastNoShows(String user) {
        return oracle.asUser(user, repository::markPastNoShows);
    }
}
