package lk.medicare.dto;

import java.time.LocalDate;

public record SessionAvailability(
        Long scheduleId,
        LocalDate date,
        int maxPatients,
        int availableSlots) {
}
