package lk.medicare.repository;

import lk.medicare.dto.Doctor;
import lk.medicare.dto.DoctorRequest;
import lk.medicare.repository.support.OracleJdbcSupport;
import org.springframework.jdbc.core.DataClassRowMapper;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.stereotype.Repository;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

@Repository
public class DoctorRepository {

    private static final String SELECT = """
            SELECT d.doctor_id, d.specialization_id, sp.name AS specialization_name,
                   d.first_name, d.last_name, 'Dr. ' || d.first_name || ' ' || d.last_name AS full_name,
                   d.slmc_reg_no, d.email, d.phone, d.consultation_fee, d.experience_years, d.status
            FROM   doctor d
            JOIN   specialization sp ON sp.specialization_id = d.specialization_id
            WHERE  1 = 1
            """;

    private final JdbcTemplate jdbc;
    private final OracleJdbcSupport oracle;
    private final RowMapper<Doctor> mapper = new DataClassRowMapper<>(Doctor.class);

    public DoctorRepository(JdbcTemplate jdbc, OracleJdbcSupport oracle) {
        this.jdbc = jdbc;
        this.oracle = oracle;
    }

    public List<Doctor> findAll(Long specializationId, String status, String search) {
        StringBuilder sql = new StringBuilder(SELECT);
        List<Object> args = new ArrayList<>();
        if (specializationId != null) {
            sql.append(" AND d.specialization_id = ?");
            args.add(specializationId);
        }
        if (status != null && !status.isBlank()) {
            sql.append(" AND d.status = ?");
            args.add(status.toUpperCase());
        }
        if (search != null && !search.isBlank()) {
            sql.append(" AND (UPPER(d.first_name || ' ' || d.last_name) LIKE ? OR UPPER(d.slmc_reg_no) LIKE ?)");
            String like = "%" + search.trim().toUpperCase() + "%";
            args.add(like);
            args.add(like);
        }
        sql.append(" ORDER BY d.first_name, d.last_name");
        return jdbc.query(sql.toString(), mapper, args.toArray());
    }

    public Optional<Doctor> findById(long id) {
        return jdbc.query(SELECT + " AND d.doctor_id = ?", mapper, id).stream().findFirst();
    }

    public long insert(DoctorRequest r) {
        return oracle.insert("""
                INSERT INTO doctor (specialization_id, first_name, last_name, slmc_reg_no, email, phone,
                                    consultation_fee, experience_years, status)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, "DOCTOR_ID",
                r.specializationId(), r.firstName(), r.lastName(), r.slmcRegNo(), r.email(), r.phone(),
                r.consultationFee(), r.experienceYears(), r.status() == null ? "ACTIVE" : r.status());
    }

    public int update(long id, DoctorRequest r) {
        return jdbc.update("""
                UPDATE doctor
                SET    specialization_id = ?, first_name = ?, last_name = ?, slmc_reg_no = ?, email = ?,
                       phone = ?, consultation_fee = ?, experience_years = ?, status = NVL(?, status)
                WHERE  doctor_id = ?
                """,
                r.specializationId(), r.firstName(), r.lastName(), r.slmcRegNo(), r.email(), r.phone(),
                r.consultationFee(), r.experienceYears(), r.status(), id);
    }

    public int updateStatus(long id, String status) {
        return jdbc.update("UPDATE doctor SET status = ? WHERE doctor_id = ?", status, id);
    }

    public int delete(long id) {
        return jdbc.update("DELETE FROM doctor WHERE doctor_id = ?", id);
    }
}
