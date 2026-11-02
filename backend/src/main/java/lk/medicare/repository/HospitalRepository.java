package lk.medicare.repository;

import lk.medicare.dto.Hospital;
import lk.medicare.dto.HospitalRequest;
import lk.medicare.repository.support.OracleJdbcSupport;
import org.springframework.jdbc.core.DataClassRowMapper;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public class HospitalRepository {

    private static final String SELECT = """
            SELECT h.hospital_id, h.name, h.address, h.city, h.phone, h.email,
                   (SELECT COUNT(DISTINCT s.doctor_id) FROM doctor_schedule s WHERE s.hospital_id = h.hospital_id) AS doctor_count,
                   (SELECT COUNT(*) FROM doctor_schedule s WHERE s.hospital_id = h.hospital_id) AS session_count
            FROM   hospital h
            """;

    private final JdbcTemplate jdbc;
    private final OracleJdbcSupport oracle;
    private final RowMapper<Hospital> mapper = new DataClassRowMapper<>(Hospital.class);

    public HospitalRepository(JdbcTemplate jdbc, OracleJdbcSupport oracle) {
        this.jdbc = jdbc;
        this.oracle = oracle;
    }

    public List<Hospital> findAll(String city) {
        if (city == null || city.isBlank()) {
            return jdbc.query(SELECT + " ORDER BY h.name", mapper);
        }
        return jdbc.query(SELECT + " WHERE UPPER(h.city) = UPPER(?) ORDER BY h.name", mapper, city);
    }

    public Optional<Hospital> findById(long id) {
        return jdbc.query(SELECT + " WHERE h.hospital_id = ?", mapper, id).stream().findFirst();
    }

    public long insert(HospitalRequest r) {
        return oracle.insert("INSERT INTO hospital (name, address, city, phone, email) VALUES (?, ?, ?, ?, ?)",
                "HOSPITAL_ID", r.name(), r.address(), r.city(), r.phone(), r.email());
    }

    public int update(long id, HospitalRequest r) {
        return jdbc.update("""
                UPDATE hospital SET name = ?, address = ?, city = ?, phone = ?, email = ?
                WHERE  hospital_id = ?
                """, r.name(), r.address(), r.city(), r.phone(), r.email(), id);
    }

    public int delete(long id) {
        return jdbc.update("DELETE FROM hospital WHERE hospital_id = ?", id);
    }
}
