package lk.medicare.dto;

import java.math.BigDecimal;
import java.time.LocalDate;

public record Payment(
        Long paymentId,
        Long appointmentId,
        LocalDate appointmentDate,
        String appointmentStatus,
        Long patientId,
        String patientName,
        String doctorName,
        String hospitalName,
        BigDecimal amount,
        String paymentMethod,
        String paymentStatus,
        LocalDate paymentDate) {
}
