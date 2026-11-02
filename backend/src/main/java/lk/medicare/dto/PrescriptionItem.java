package lk.medicare.dto;

public record PrescriptionItem(
        Long itemId,
        Long consultationId,
        String medicineName,
        String dosage,
        String frequency,
        Integer durationDays,
        String instructions) {
}
