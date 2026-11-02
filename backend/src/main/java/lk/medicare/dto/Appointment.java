package lk.medicare.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

public record Appointment(
        Long appointmentId,
        LocalDate appointmentDate,
        Integer queueNo,
        String status,
        LocalDateTime bookedAt,
        String notes,
        Long patientId,
        String patientName,
        String patientNic,
        String patientPhone,
        Long scheduleId,
        String dayOfWeek,
        String startTime,
        String endTime,
        Long doctorId,
        String doctorName,
        Long specializationId,
        String specialization,
        Long hospitalId,
        String hospitalName,
        String hospitalCity,
        Long paymentId,
        BigDecimal amount,
        String paymentMethod,
        String paymentStatus,
        LocalDate paymentDate,
        Long consultationId) {
}
