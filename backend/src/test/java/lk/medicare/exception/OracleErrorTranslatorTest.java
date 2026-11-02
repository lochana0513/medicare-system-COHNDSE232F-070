package lk.medicare.exception;

import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;

import java.sql.SQLException;

import static org.assertj.core.api.Assertions.assertThat;

class OracleErrorTranslatorTest {

    private static OracleErrorTranslator.Translation translate(int code, String message) {
        return OracleErrorTranslator.translate(new SQLException(message, "72000", code));
    }

    @Test
    void notFoundErrorMapsTo404WithoutOraPrefix() {
        var t = translate(20001, "ORA-20001: Patient 99 not found\nORA-06512: at \"MEDICARE.MEDICARE_PKG\", line 210");
        assertThat(t.status()).isEqualTo(HttpStatus.NOT_FOUND);
        assertThat(t.message()).isEqualTo("Patient 99 not found");
    }

    @Test
    void businessRuleErrorMapsTo409() {
        var t = translate(20006, "ORA-20006: Session is fully booked (10 patients)\nORA-06512: at line 1");
        assertThat(t.status()).isEqualTo(HttpStatus.CONFLICT);
        assertThat(t.oracleCode()).isEqualTo(20006);
    }

    @Test
    void invalidDataErrorMapsTo400() {
        var t = translate(20011, "ORA-20011: Invalid patient data");
        assertThat(t.status()).isEqualTo(HttpStatus.BAD_REQUEST);
    }

    @Test
    void knownUniqueConstraintGetsFriendlyMessage() {
        var t = translate(1, "ORA-00001: unique constraint (MEDICARE.UQ_DOCTOR_SLMC) violated");
        assertThat(t.status()).isEqualTo(HttpStatus.CONFLICT);
        assertThat(t.message()).isEqualTo("A doctor with this SLMC registration number already exists");
    }

    @Test
    void childRecordErrorMapsTo409() {
        var t = translate(2292, "ORA-02292: integrity constraint (MEDICARE.FK_APPT_PATIENT) violated - child record found");
        assertThat(t.status()).isEqualTo(HttpStatus.CONFLICT);
        assertThat(t.message()).contains("cannot be deleted");
    }

    @Test
    void unknownErrorMapsTo500() {
        var t = translate(12345, "ORA-12345: something went wrong");
        assertThat(t.status()).isEqualTo(HttpStatus.INTERNAL_SERVER_ERROR);
    }
}
