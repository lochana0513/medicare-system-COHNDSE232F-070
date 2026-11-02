package lk.medicare.repository;

import lk.medicare.dto.Consultation;
import lk.medicare.dto.ConsultationRequest;
import lk.medicare.dto.PrescriptionItem;
import lk.medicare.dto.PrescriptionItemRequest;
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
public class ConsultationRepository {

    private static final String SELECT = """
            SELECT c.consultation_id, c.appointment_id, c.consultation_date, c.symptoms, c.diagnosis, c.notes,
                   c.follow_up_date, a.patient_id, p.first_name || ' ' || p.last_name AS patient_name,
                   d.doctor_id, 'Dr. ' || d.first_name || ' ' || d.last_name AS doctor_name,
                   sp.name AS specialization, h.name AS hospital_name,
                   (SELECT COUNT(*) FROM prescription_item pi WHERE pi.consultation_id = c.consultation_id) AS item_count
            FROM   consultation c
            JOIN   appointment     a  ON a.appointment_id = c.appointment_id
            JOIN   patient         p  ON p.patient_id = a.patient_id
            JOIN   doctor_schedule s  ON s.schedule_id = a.schedule_id
            JOIN   doctor          d  ON d.doctor_id = s.doctor_id
            JOIN   specialization  sp ON sp.specialization_id = d.specialization_id
            JOIN   hospital        h  ON h.hospital_id = s.hospital_id
            WHERE  1 = 1
            """;

    private final JdbcTemplate jdbc;
    private final SimpleJdbcCall recordConsultation;
    private final SimpleJdbcCall addItem;
    private final RowMapper<PrescriptionItem> itemMapper = new DataClassRowMapper<>(PrescriptionItem.class);

    private final RowMapper<Consultation> mapper = (rs, rowNum) -> new Consultation(
            rs.getLong("consultation_id"),
            rs.getLong("appointment_id"),
            rs.getObject("consultation_date", LocalDate.class),
            rs.getString("symptoms"),
            rs.getString("diagnosis"),
            rs.getString("notes"),
            rs.getObject("follow_up_date", LocalDate.class),
            rs.getLong("patient_id"),
            rs.getString("patient_name"),
            rs.getLong("doctor_id"),
            rs.getString("doctor_name"),
            rs.getString("specialization"),
            rs.getString("hospital_name"),
            rs.getInt("item_count"),
            null);

    public ConsultationRepository(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
        this.recordConsultation = new SimpleJdbcCall(jdbc)
                .withCatalogName("MEDICARE_PKG")
                .withProcedureName("PR_RECORD_CONSULTATION");
        this.addItem = new SimpleJdbcCall(jdbc)
                .withCatalogName("MEDICARE_PKG")
                .withProcedureName("PR_ADD_PRESCRIPTION_ITEM");
    }

    public List<Consultation> findAll(Long patientId, Long doctorId, String search) {
        StringBuilder sql = new StringBuilder(SELECT);
        List<Object> args = new ArrayList<>();
        if (patientId != null) {
            sql.append(" AND a.patient_id = ?");
            args.add(patientId);
        }
        if (doctorId != null) {
            sql.append(" AND d.doctor_id = ?");
            args.add(doctorId);
        }
        if (search != null && !search.isBlank()) {
            sql.append(" AND (UPPER(c.diagnosis) LIKE ? OR UPPER(p.first_name || ' ' || p.last_name) LIKE ?)");
            String like = "%" + search.trim().toUpperCase() + "%";
            args.add(like);
            args.add(like);
        }
        sql.append(" ORDER BY c.consultation_date DESC, c.consultation_id DESC");
        return jdbc.query(sql.toString(), mapper, args.toArray());
    }

    public Optional<Consultation> findById(long id) {
        return jdbc.query(SELECT + " AND c.consultation_id = ?", mapper, id).stream().findFirst();
    }

    public List<PrescriptionItem> findItems(long consultationId) {
        return jdbc.query("""
                SELECT item_id, consultation_id, medicine_name, dosage, frequency, duration_days, instructions
                FROM   prescription_item
                WHERE  consultation_id = ?
                ORDER BY item_id
                """, itemMapper, consultationId);
    }

    /** Records the consultation through MEDICARE_PKG.PR_RECORD_CONSULTATION (also completes the appointment). */
    public long record(long appointmentId, ConsultationRequest r) {
        Map<String, Object> out = recordConsultation.execute(new MapSqlParameterSource()
                .addValue("P_APPOINTMENT_ID", appointmentId)
                .addValue("P_SYMPTOMS", r.symptoms())
                .addValue("P_DIAGNOSIS", r.diagnosis())
                .addValue("P_NOTES", r.notes())
                .addValue("P_FOLLOW_UP_DATE", r.followUpDate() == null ? null : Date.valueOf(r.followUpDate())));
        return ((Number) out.get("P_CONSULTATION_ID")).longValue();
    }

    public long addItem(long consultationId, PrescriptionItemRequest r) {
        Map<String, Object> out = addItem.execute(new MapSqlParameterSource()
                .addValue("P_CONSULTATION_ID", consultationId)
                .addValue("P_MEDICINE_NAME", r.medicineName())
                .addValue("P_DOSAGE", r.dosage())
                .addValue("P_FREQUENCY", r.frequency())
                .addValue("P_DURATION_DAYS", r.durationDays())
                .addValue("P_INSTRUCTIONS", r.instructions()));
        return ((Number) out.get("P_ITEM_ID")).longValue();
    }

    public int deleteItem(long consultationId, long itemId) {
        return jdbc.update("DELETE FROM prescription_item WHERE consultation_id = ? AND item_id = ?",
                consultationId, itemId);
    }
}
