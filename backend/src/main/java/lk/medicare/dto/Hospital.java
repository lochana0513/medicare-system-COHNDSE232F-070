package lk.medicare.dto;

public record Hospital(
        Long hospitalId,
        String name,
        String address,
        String city,
        String phone,
        String email,
        Integer doctorCount,
        Integer sessionCount) {
}
