package lk.medicare.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Past;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;

public record PatientRequest(
        @NotBlank @Size(max = 50) String firstName,
        @NotBlank @Size(max = 50) String lastName,
        @NotBlank @Pattern(regexp = ValidationPatterns.NIC, message = ValidationPatterns.NIC_MESSAGE) String nic,
        @NotNull @Past LocalDate dateOfBirth,
        @NotBlank @Pattern(regexp = ValidationPatterns.GENDER, message = "must be M, F or O") String gender,
        @NotBlank @Pattern(regexp = ValidationPatterns.PHONE, message = ValidationPatterns.PHONE_MESSAGE) String phone,
        @Email @Size(max = 100) String email,
        @Size(max = 200) String address,
        @Pattern(regexp = ValidationPatterns.BLOOD_GROUP, message = "must be a valid blood group, e.g. O+") String bloodGroup) {
}
