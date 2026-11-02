package lk.medicare.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record HospitalRequest(
        @NotBlank @Size(max = 100) String name,
        @NotBlank @Size(max = 200) String address,
        @NotBlank @Size(max = 50) String city,
        @NotBlank @Pattern(regexp = ValidationPatterns.PHONE, message = ValidationPatterns.PHONE_MESSAGE) String phone,
        @Email @Size(max = 100) String email) {
}
