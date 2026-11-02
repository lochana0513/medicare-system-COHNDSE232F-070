package lk.medicare.repository.support;

import org.springframework.jdbc.core.CallableStatementCallback;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.ResultSetExtractor;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.jdbc.support.KeyHolder;
import org.springframework.stereotype.Component;

import java.sql.CallableStatement;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.ResultSetMetaData;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.sql.Types;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.function.Supplier;

/**
 * Helpers for Oracle features that plain JdbcTemplate calls don't cover:
 * functions returning SYS_REFCURSOR, identity keys and the session client identifier.
 */
@Component
public class OracleJdbcSupport {

    private final JdbcTemplate jdbc;

    public OracleJdbcSupport(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    /** Calls a PL/SQL function that returns a SYS_REFCURSOR and maps each row to a camelCase map. */
    public List<Map<String, Object>> queryRefCursor(String function, Object... args) {
        String placeholders = String.join(", ", Collections.nCopies(args.length, "?"));
        String sql = "{ ? = call " + function + "(" + placeholders + ") }";

        return jdbc.execute(sql, (CallableStatementCallback<List<Map<String, Object>>>) cs -> {
            cs.registerOutParameter(1, Types.REF_CURSOR);
            for (int i = 0; i < args.length; i++) {
                bind(cs, i + 2, args[i]);
            }
            cs.execute();
            try (ResultSet rs = cs.getObject(1, ResultSet.class)) {
                return mapRows(rs);
            }
        });
    }

    /** Runs a single-row query and returns the row as a camelCase map. */
    public Map<String, Object> queryForRow(String sql, Object... args) {
        List<Map<String, Object>> rows = queryForRows(sql, args);
        return rows.isEmpty() ? Map.of() : rows.get(0);
    }

    public List<Map<String, Object>> queryForRows(String sql, Object... args) {
        return jdbc.query(sql, (ResultSetExtractor<List<Map<String, Object>>>) OracleJdbcSupport::mapRows, args);
    }

    /** Executes an INSERT and returns the value of the identity column. */
    public long insert(String sql, String idColumn, Object... args) {
        KeyHolder keys = new GeneratedKeyHolder();
        jdbc.update(con -> {
            PreparedStatement ps = con.prepareStatement(sql, new String[]{idColumn});
            for (int i = 0; i < args.length; i++) {
                ps.setObject(i + 1, toJdbc(args[i]));
            }
            return ps;
        }, keys);
        return keys.getKey().longValue();
    }

    /**
     * Sets DBMS_SESSION client identifier for the duration of the action so the
     * audit trigger records who made the change. Must run inside a transaction
     * so the same connection is used for both calls.
     */
    public <T> T asUser(String user, Supplier<T> action) {
        jdbc.update("BEGIN DBMS_SESSION.SET_IDENTIFIER(?); END;", user);
        try {
            return action.get();
        } finally {
            jdbc.update("BEGIN DBMS_SESSION.CLEAR_IDENTIFIER; END;");
        }
    }

    public void runAsUser(String user, Runnable action) {
        asUser(user, () -> {
            action.run();
            return null;
        });
    }

    // ------------------------------------------------------------------

    private static void bind(CallableStatement cs, int index, Object value) throws SQLException {
        if (value == null) {
            cs.setNull(index, Types.VARCHAR);
        } else {
            cs.setObject(index, toJdbc(value));
        }
    }

    private static Object toJdbc(Object value) {
        if (value instanceof LocalDate date) {
            return java.sql.Date.valueOf(date);
        }
        return value;
    }

    private static List<Map<String, Object>> mapRows(ResultSet rs) throws SQLException {
        ResultSetMetaData md = rs.getMetaData();
        List<Map<String, Object>> rows = new ArrayList<>();
        while (rs.next()) {
            Map<String, Object> row = new LinkedHashMap<>();
            for (int i = 1; i <= md.getColumnCount(); i++) {
                row.put(toCamelCase(md.getColumnLabel(i)), readValue(rs, i, md.getColumnType(i)));
            }
            rows.add(row);
        }
        return rows;
    }

    private static Object readValue(ResultSet rs, int index, int sqlType) throws SQLException {
        if (sqlType == Types.DATE || sqlType == Types.TIMESTAMP) {
            Timestamp ts = rs.getTimestamp(index);
            if (ts == null) {
                return null;
            }
            LocalDateTime value = ts.toLocalDateTime();
            // Oracle DATE columns that only hold a day are returned as LocalDate
            return value.toLocalTime().toSecondOfDay() == 0 ? value.toLocalDate() : value;
        }
        return rs.getObject(index);
    }

    static String toCamelCase(String column) {
        String[] parts = column.toLowerCase().split("_");
        StringBuilder sb = new StringBuilder(parts[0]);
        for (int i = 1; i < parts.length; i++) {
            if (!parts[i].isEmpty()) {
                sb.append(Character.toUpperCase(parts[i].charAt(0))).append(parts[i].substring(1));
            }
        }
        return sb.toString();
    }
}
