package lk.medicare.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record PrescriptionItemRequest(
        @NotBlank @Size(max = 100) String medicineName,
        @NotBlank @Size(max = 30) String dosage,
        @NotBlank @Size(max = 30) String frequency,
        @NotNull @Min(1) @Max(365) Integer durationDays,
        @Size(max = 200) String instructions) {
}
