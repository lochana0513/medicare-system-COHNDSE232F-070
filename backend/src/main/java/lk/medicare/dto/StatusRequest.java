package lk.medicare.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

public record StatusRequest(
        @NotBlank @Pattern(regexp = ValidationPatterns.DOCTOR_STATUS, message = "must be ACTIVE, ON_LEAVE or INACTIVE")
        String status) {
}
