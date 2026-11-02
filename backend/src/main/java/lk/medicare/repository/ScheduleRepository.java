package lk.medicare.repository;

import lk.medicare.dto.Schedule;
import lk.medicare.dto.ScheduleRequest;
import lk.medicare.repository.support.OracleJdbcSupport;
import org.springframework.jdbc.core.DataClassRowMapper;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.stereotype.Repository;

import java.sql.Date;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

@Repository
public class ScheduleRepository {

    private static final String SELECT = """
            SELECT s.schedule_id, s.doctor_id, 'Dr. ' || d.first_name || ' ' || d.last_name AS doctor_name,
                   sp.name AS specialization_name, d.status AS doctor_status, d.consultation_fee,
                   s.hospital_id, h.name AS hospital_name, h.city,
                   s.day_of_week, s.start_time, s.end_time, s.max_patients
            FROM   doctor_schedule s
            JOIN   doctor          d  ON d.doctor_id = s.doctor_id
            JOIN   specialization  sp ON sp.specialization_id = d.specialization_id
            JOIN   hospital        h  ON h.hospital_id = s.hospital_id
            WHERE  1 = 1
            """;

    private static final String ORDER = """
             ORDER BY doctor_name,
                      DECODE(s.day_of_week, 'MON', 1, 'TUE', 2, 'WED', 3, 'THU', 4, 'FRI', 5, 'SAT', 6, 7),
                      s.start_time
            """;

    private final JdbcTemplate jdbc;
    private final OracleJdbcSupport oracle;
    private final RowMapper<Schedule> mapper = new DataClassRowMapper<>(Schedule.class);

    public ScheduleRepository(JdbcTemplate jdbc, OracleJdbcSupport oracle) {
        this.jdbc = jdbc;
        this.oracle = oracle;
    }

    public List<Schedule> findAll(Long doctorId, Long hospitalId, Long specializationId, String day) {
        StringBuilder sql = new StringBuilder(SELECT);
        List<Object> args = new ArrayList<>();
        if (doctorId != null) {
            sql.append(" AND s.doctor_id = ?");
            args.add(doctorId);
        }
        if (hospitalId != null) {
            sql.append(" AND s.hospital_id = ?");
            args.add(hospitalId);
        }
        if (specializationId != null) {
            sql.append(" AND d.specialization_id = ?");
            args.add(specializationId);
        }
        if (day != null && !day.isBlank()) {
            sql.append(" AND s.day_of_week = ?");
            args.add(day.toUpperCase());
        }
        sql.append(ORDER);
        return jdbc.query(sql.toString(), mapper, args.toArray());
    }

    public Optional<Schedule> findById(long id) {
        return jdbc.query(SELECT + " AND s.schedule_id = ?", mapper, id).stream().findFirst();
    }

    /** Free slots for one session, calculated by MEDICARE_PKG.FN_AVAILABLE_SLOTS. */
    public int availableSlots(long scheduleId, LocalDate date) {
        Integer slots = jdbc.queryForObject("SELECT medicare_pkg.fn_available_slots(?, ?) FROM dual",
                Integer.class, scheduleId, Date.valueOf(date));
        return slots == null ? 0 : slots;
    }

    public long insert(ScheduleRequest r) {
        return oracle.insert("""
                INSERT INTO doctor_schedule (doctor_id, hospital_id, day_of_week, start_time, end_time, max_patients)
                VALUES (?, ?, ?, ?, ?, ?)
                """, "SCHEDULE_ID",
                r.doctorId(), r.hospitalId(), r.dayOfWeek(), r.startTime(), r.endTime(), r.maxPatients());
    }

    public int update(long id, ScheduleRequest r) {
        return jdbc.update("""
                UPDATE doctor_schedule
                SET    doctor_id = ?, hospital_id = ?, day_of_week = ?, start_time = ?, end_time = ?, max_patients = ?
                WHERE  schedule_id = ?
                """, r.doctorId(), r.hospitalId(), r.dayOfWeek(), r.startTime(), r.endTime(), r.maxPatients(), id);
    }

    public int delete(long id) {
        return jdbc.update("DELETE FROM doctor_schedule WHERE schedule_id = ?", id);
    }
}
