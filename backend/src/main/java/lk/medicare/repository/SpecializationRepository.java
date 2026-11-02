package lk.medicare.repository;

import lk.medicare.dto.Specialization;
import lk.medicare.dto.SpecializationRequest;
import lk.medicare.repository.support.OracleJdbcSupport;
import org.springframework.jdbc.core.DataClassRowMapper;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public class SpecializationRepository {

    private static final String SELECT = """
            SELECT s.specialization_id, s.name, s.description,
                   (SELECT COUNT(*) FROM doctor d WHERE d.specialization_id = s.specialization_id) AS doctor_count
            FROM   specialization s
            """;

    private final JdbcTemplate jdbc;
    private final OracleJdbcSupport oracle;
    private final RowMapper<Specialization> mapper = new DataClassRowMapper<>(Specialization.class);

    public SpecializationRepository(JdbcTemplate jdbc, OracleJdbcSupport oracle) {
        this.jdbc = jdbc;
        this.oracle = oracle;
    }

    public List<Specialization> findAll() {
        return jdbc.query(SELECT + " ORDER BY s.name", mapper);
    }

    public Optional<Specialization> findById(long id) {
        return jdbc.query(SELECT + " WHERE s.specialization_id = ?", mapper, id).stream().findFirst();
    }

    public long insert(SpecializationRequest r) {
        return oracle.insert("INSERT INTO specialization (name, description) VALUES (?, ?)",
                "SPECIALIZATION_ID", r.name(), r.description());
    }

    public int update(long id, SpecializationRequest r) {
        return jdbc.update("UPDATE specialization SET name = ?, description = ? WHERE specialization_id = ?",
                r.name(), r.description(), id);
    }

    public int delete(long id) {
        return jdbc.update("DELETE FROM specialization WHERE specialization_id = ?", id);
    }
}
