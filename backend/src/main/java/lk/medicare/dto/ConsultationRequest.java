package lk.medicare.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Future;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;
import java.util.List;

public record ConsultationRequest(
        @Size(max = 500) String symptoms,
        @NotBlank @Size(max = 500) String diagnosis,
        @Size(max = 500) String notes,
        @Future LocalDate followUpDate,
        List<@Valid PrescriptionItemRequest> items) {
}
