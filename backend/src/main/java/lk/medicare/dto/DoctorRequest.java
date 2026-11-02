package lk.medicare.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;

public record DoctorRequest(
        @NotNull Long specializationId,
        @NotBlank @Size(max = 50) String firstName,
        @NotBlank @Size(max = 50) String lastName,
        @NotBlank @Size(max = 15) String slmcRegNo,
        @NotBlank @Email @Size(max = 100) String email,
        @NotBlank @Pattern(regexp = ValidationPatterns.PHONE, message = ValidationPatterns.PHONE_MESSAGE) String phone,
        @NotNull @DecimalMin(value = "0.01", message = "must be greater than 0") BigDecimal consultationFee,
        @NotNull @Min(0) @Max(60) Integer experienceYears,
        @Pattern(regexp = ValidationPatterns.DOCTOR_STATUS, message = "must be ACTIVE, ON_LEAVE or INACTIVE") String status) {
}
