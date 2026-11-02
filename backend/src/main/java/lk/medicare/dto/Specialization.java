package lk.medicare.dto;

public record Specialization(
        Long specializationId,
        String name,
        String description,
        Integer doctorCount) {
}
