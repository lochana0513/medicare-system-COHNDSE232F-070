package lk.medicare.repository;

import lk.medicare.dto.Patient;
import lk.medicare.dto.PatientRequest;
import org.springframework.jdbc.core.DataClassRowMapper;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.simple.SimpleJdbcCall;
import org.springframework.stereotype.Repository;

import java.sql.Date;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Repository
public class PatientRepository {

    private static final String SELECT = """
            SELECT p.patient_id, p.first_name, p.last_name, p.first_name || ' ' || p.last_name AS full_name,
                   p.nic, p.date_of_birth, medicare_pkg.fn_patient_age(p.patient_id) AS age,
                   p.gender, p.phone, p.email, p.address, p.blood_group, p.registered_date
            FROM   patient p
            """;

    private final JdbcTemplate jdbc;
    private final SimpleJdbcCall registerPatient;
    private final RowMapper<Patient> mapper = new DataClassRowMapper<>(Patient.class);

    public PatientRepository(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
        this.registerPatient = new SimpleJdbcCall(jdbc)
                .withCatalogName("MEDICARE_PKG")
                .withProcedureName("PR_REGISTER_PATIENT");
    }

    public List<Patient> findAll(String search) {
        if (search == null || search.isBlank()) {
            return jdbc.query(SELECT + " ORDER BY p.first_name, p.last_name", mapper);
        }
        String like = "%" + search.trim().toUpperCase() + "%";
        return jdbc.query(SELECT + """
                 WHERE UPPER(p.first_name || ' ' || p.last_name) LIKE ? OR UPPER(p.nic) LIKE ? OR p.phone LIKE ?
                 ORDER BY p.first_name, p.last_name
                """, mapper, like, like, like);
    }

    public Optional<Patient> findById(long id) {
        return jdbc.query(SELECT + " WHERE p.patient_id = ?", mapper, id).stream().findFirst();
    }

    /** Registers a patient through MEDICARE_PKG.PR_REGISTER_PATIENT and returns the new id. */
    public long register(PatientRequest r) {
        Map<String, Object> out = registerPatient.execute(new MapSqlParameterSource()
                .addValue("P_FIRST_NAME", r.firstName())
                .addValue("P_LAST_NAME", r.lastName())
                .addValue("P_NIC", r.nic())
                .addValue("P_DATE_OF_BIRTH", Date.valueOf(r.dateOfBirth()))
                .addValue("P_GENDER", r.gender())
                .addValue("P_PHONE", r.phone())
                .addValue("P_EMAIL", r.email())
                .addValue("P_ADDRESS", r.address())
                .addValue("P_BLOOD_GROUP", r.bloodGroup()));
        return ((Number) out.get("P_PATIENT_ID")).longValue();
    }

    public int update(long id, PatientRequest r) {
        return jdbc.update("""
                UPDATE patient
                SET    first_name = ?, last_name = ?, nic = ?, date_of_birth = ?, gender = ?, phone = ?,
                       email = ?, address = ?, blood_group = ?
                WHERE  patient_id = ?
                """,
                r.firstName(), r.lastName(), r.nic(), Date.valueOf(r.dateOfBirth()), r.gender(), r.phone(),
                r.email(), r.address(), r.bloodGroup(), id);
    }

    public int delete(long id) {
        return jdbc.update("DELETE FROM patient WHERE patient_id = ?", id);
    }
}
