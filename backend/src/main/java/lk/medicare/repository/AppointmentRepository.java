package lk.medicare.repository;

import lk.medicare.dto.Appointment;
import lk.medicare.dto.AuditEntry;
import lk.medicare.dto.BookAppointmentRequest;
import org.springframework.jdbc.core.DataClassRowMapper;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.simple.SimpleJdbcCall;
import org.springframework.stereotype.Repository;

import java.sql.Date;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Repository
public class AppointmentRepository {

    /** Filter values for the appointment list; any field may be null. */
    public record Filter(LocalDate date, LocalDate from, LocalDate to, String status, Long patientId,
                         Long doctorId, Long hospitalId, Long scheduleId, String search) {
    }

    private static final String SELECT = """
            SELECT appointment_id, appointment_date, queue_no, status, booked_at, notes,
                   patient_id, patient_name, patient_nic, patient_phone,
                   schedule_id, day_of_week, start_time, end_time,
                   doctor_id, doctor_name, specialization_id, specialization,
                   hospital_id, hospital_name, hospital_city,
                   payment_id, amount, payment_method, payment_status, payment_date, consultation_id
            FROM   v_appointment_details
            WHERE  1 = 1
            """;

    private final JdbcTemplate jdbc;
    private final SimpleJdbcCall bookAppointment;
    private final SimpleJdbcCall markNoShows;
    private final RowMapper<Appointment> mapper = new DataClassRowMapper<>(Appointment.class);
    private final RowMapper<AuditEntry> auditMapper = new DataClassRowMapper<>(AuditEntry.class);

    public AppointmentRepository(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
        this.bookAppointment = new SimpleJdbcCall(jdbc)
                .withCatalogName("MEDICARE_PKG")
                .withProcedureName("PR_BOOK_APPOINTMENT");
        this.markNoShows = new SimpleJdbcCall(jdbc)
                .withCatalogName("MEDICARE_PKG")
                .withProcedureName("PR_MARK_PAST_NO_SHOWS");
    }

    public List<Appointment> findAll(Filter f) {
        StringBuilder sql = new StringBuilder(SELECT);
        List<Object> args = new ArrayList<>();
        if (f.date() != null) {
            sql.append(" AND appointment_date = ?");
            args.add(Date.valueOf(f.date()));
        }
        if (f.from() != null) {
            sql.append(" AND appointment_date >= ?");
            args.add(Date.valueOf(f.from()));
        }
        if (f.to() != null) {
            sql.append(" AND appointment_date <= ?");
            args.add(Date.valueOf(f.to()));
        }
        if (f.status() != null && !f.status().isBlank()) {
            sql.append(" AND status = ?");
            args.add(f.status().toUpperCase());
        }
        if (f.patientId() != null) {
            sql.append(" AND patient_id = ?");
            args.add(f.patientId());
        }
        if (f.doctorId() != null) {
            sql.append(" AND doctor_id = ?");
            args.add(f.doctorId());
        }
        if (f.hospitalId() != null) {
            sql.append(" AND hospital_id = ?");
            args.add(f.hospitalId());
        }
        if (f.scheduleId() != null) {
            sql.append(" AND schedule_id = ?");
            args.add(f.scheduleId());
        }
        if (f.search() != null && !f.search().isBlank()) {
            sql.append(" AND (UPPER(patient_name) LIKE ? OR UPPER(patient_nic) LIKE ? OR UPPER(doctor_name) LIKE ?)");
            String like = "%" + f.search().trim().toUpperCase() + "%";
            args.add(like);
            args.add(like);
            args.add(like);
        }
        sql.append(" ORDER BY appointment_date DESC, start_time, queue_no");
        return jdbc.query(sql.toString(), mapper, args.toArray());
    }

    public Optional<Appointment> findById(long id) {
        return jdbc.query(SELECT + " AND appointment_id = ?", mapper, id).stream().findFirst();
    }

    public List<AuditEntry> findAudit(long appointmentId) {
        return jdbc.query("""
                SELECT audit_id, old_status, new_status, changed_by, changed_at
                FROM   appointment_audit
                WHERE  appointment_id = ?
                ORDER BY changed_at, audit_id
                """, auditMapper, appointmentId);
    }

    /** Books through MEDICARE_PKG.PR_BOOK_APPOINTMENT and returns the new appointment id. */
    public long book(BookAppointmentRequest r) {
        Map<String, Object> out = bookAppointment.execute(new MapSqlParameterSource()
                .addValue("P_PATIENT_ID", r.patientId())
                .addValue("P_SCHEDULE_ID", r.scheduleId())
                .addValue("P_DATE", Date.valueOf(r.appointmentDate()))
                .addValue("P_PAYMENT_METHOD", r.paymentMethod() == null ? "CASH" : r.paymentMethod())
                .addValue("P_NOTES", r.notes()));
        return ((Number) out.get("P_APPOINTMENT_ID")).longValue();
    }

    public void confirm(long id) {
        jdbc.update("BEGIN medicare_pkg.pr_confirm_appointment(?); END;", id);
    }

    public void cancel(long id) {
        jdbc.update("BEGIN medicare_pkg.pr_cancel_appointment(?); END;", id);
    }

    public void processPayment(long id, String method) {
        jdbc.update("BEGIN medicare_pkg.pr_process_payment(?, ?); END;", id, method);
    }

    public int markPastNoShows() {
        Map<String, Object> out = markNoShows.execute(new MapSqlParameterSource());
        return ((Number) out.get("P_COUNT")).intValue();
    }
}
