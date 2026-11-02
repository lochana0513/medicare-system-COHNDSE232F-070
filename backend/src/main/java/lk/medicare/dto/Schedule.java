package lk.medicare.dto;

import java.math.BigDecimal;

public record Schedule(
        Long scheduleId,
        Long doctorId,
        String doctorName,
        String specializationName,
        String doctorStatus,
        BigDecimal consultationFee,
        Long hospitalId,
        String hospitalName,
        String city,
        String dayOfWeek,
        String startTime,
        String endTime,
        Integer maxPatients) {
}
