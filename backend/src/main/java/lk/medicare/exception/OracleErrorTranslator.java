package lk.medicare.exception;

import org.springframework.http.HttpStatus;

import java.sql.SQLException;
import java.util.Map;
import java.util.Optional;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Converts Oracle errors into HTTP status codes and readable messages.
 * Application errors raised by the PL/SQL packages use codes -20001 .. -20012
 * (see database/04_medicare_pkg.sql).
 */
public final class OracleErrorTranslator {

    public record Translation(HttpStatus status, int oracleCode, String message) {
    }

    private static final Pattern CONSTRAINT = Pattern.compile("\\((?:\\w+\\.)?(\\w+)\\)");

    private static final Map<String, String> CONSTRAINT_MESSAGES = Map.ofEntries(
            Map.entry("UQ_PATIENT_NIC", "A patient with this NIC is already registered"),
            Map.entry("UQ_PATIENT_EMAIL", "A patient with this email is already registered"),
            Map.entry("UQ_DOCTOR_SLMC", "A doctor with this SLMC registration number already exists"),
            Map.entry("UQ_DOCTOR_EMAIL", "A doctor with this email already exists"),
            Map.entry("UQ_SPECIALIZATION_NAME", "A specialization with this name already exists"),
            Map.entry("UQ_HOSPITAL_NAME", "A hospital with this name already exists"),
            Map.entry("UQ_SCHEDULE_SLOT", "This doctor already has a session at that day and start time"),
            Map.entry("UQ_APPT_QUEUE", "Queue number already taken for this session"),
            Map.entry("CK_SCHEDULE_TIMES", "End time must be after start time"),
            Map.entry("CK_DOCTOR_FEE", "Consultation fee must be greater than zero"),
            Map.entry("CK_PATIENT_DOB", "Date of birth cannot be after the registration date"));

    private OracleErrorTranslator() {
    }

    public static Optional<SQLException> findSqlException(Throwable error) {
        Throwable current = error;
        while (current != null) {
            if (current instanceof SQLException sql) {
                return Optional.of(sql);
            }
            current = current.getCause();
        }
        return Optional.empty();
    }

    public static Translation translate(SQLException e) {
        int code = e.getErrorCode();
        String message = firstLine(e.getMessage());

        if (code >= 20000 && code <= 20999) {
            HttpStatus status = switch (code) {
                case 20001 -> HttpStatus.NOT_FOUND;
                case 20011, 20012 -> HttpStatus.BAD_REQUEST;
                default -> HttpStatus.CONFLICT;
            };
            return new Translation(status, code, message.replaceFirst("^ORA-\\d{5}:\\s*", ""));
        }

        String constraint = constraintName(message);
        String known = constraint == null ? null : CONSTRAINT_MESSAGES.get(constraint);

        return switch (code) {
            case 1 -> new Translation(HttpStatus.CONFLICT, code,
                    known != null ? known : "Duplicate value (" + constraint + ")");
            case 2290 -> new Translation(HttpStatus.BAD_REQUEST, code,
                    known != null ? known : "Invalid value (rule " + constraint + ")");
            case 2291 -> new Translation(HttpStatus.BAD_REQUEST, code, "Referenced record does not exist");
            case 2292 -> new Translation(HttpStatus.CONFLICT, code,
                    "This record is used by other records and cannot be deleted");
            case 1400 -> new Translation(HttpStatus.BAD_REQUEST, code, "A required value is missing");
            default -> new Translation(HttpStatus.INTERNAL_SERVER_ERROR, code, "Database error: " + message);
        };
    }

    private static String firstLine(String message) {
        if (message == null) {
            return "";
        }
        return message.split("\\R", 2)[0].trim();
    }

    private static String constraintName(String message) {
        Matcher m = CONSTRAINT.matcher(message);
        return m.find() ? m.group(1) : null;
    }
}
