package lk.medicare.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;

public record BookAppointmentRequest(
        @NotNull Long patientId,
        @NotNull Long scheduleId,
        @NotNull LocalDate appointmentDate,
        @Pattern(regexp = ValidationPatterns.PAYMENT_METHOD, message = "must be CASH, CARD, ONLINE or INSURANCE") String paymentMethod,
        @Size(max = 250) String notes) {
}
