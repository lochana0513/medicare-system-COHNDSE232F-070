package lk.medicare.repository;

import lk.medicare.dto.Payment;
import org.springframework.jdbc.core.DataClassRowMapper;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.stereotype.Repository;

import java.sql.Date;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

@Repository
public class PaymentRepository {

    private static final String SELECT = """
            SELECT payment_id, appointment_id, appointment_date, status AS appointment_status,
                   patient_id, patient_name, doctor_name, hospital_name,
                   amount, payment_method, payment_status, payment_date
            FROM   v_appointment_details
            WHERE  payment_id IS NOT NULL
            """;

    private final JdbcTemplate jdbc;
    private final RowMapper<Payment> mapper = new DataClassRowMapper<>(Payment.class);

    public PaymentRepository(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public List<Payment> findAll(String status, String method, LocalDate from, LocalDate to) {
        StringBuilder sql = new StringBuilder(SELECT);
        List<Object> args = new ArrayList<>();
        if (status != null && !status.isBlank()) {
            sql.append(" AND payment_status = ?");
            args.add(status.toUpperCase());
        }
        if (method != null && !method.isBlank()) {
            sql.append(" AND payment_method = ?");
            args.add(method.toUpperCase());
        }
        if (from != null) {
            sql.append(" AND appointment_date >= ?");
            args.add(Date.valueOf(from));
        }
        if (to != null) {
            sql.append(" AND appointment_date <= ?");
            args.add(Date.valueOf(to));
        }
        sql.append(" ORDER BY appointment_date DESC, payment_id DESC");
        return jdbc.query(sql.toString(), mapper, args.toArray());
    }
}
