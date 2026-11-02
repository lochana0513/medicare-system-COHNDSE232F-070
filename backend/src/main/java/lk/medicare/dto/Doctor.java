package lk.medicare.dto;

import java.math.BigDecimal;

public record Doctor(
        Long doctorId,
        Long specializationId,
        String specializationName,
        String firstName,
        String lastName,
        String fullName,
        String slmcRegNo,
        String email,
        String phone,
        BigDecimal consultationFee,
        Integer experienceYears,
        String status) {
}
