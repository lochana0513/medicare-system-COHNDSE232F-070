package lk.medicare.dto;

import java.time.LocalDate;

public record Patient(
        Long patientId,
        String firstName,
        String lastName,
        String fullName,
        String nic,
        LocalDate dateOfBirth,
        Integer age,
        String gender,
        String phone,
        String email,
        String address,
        String bloodGroup,
        LocalDate registeredDate) {
}
