package lk.medicare.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;

public record ScheduleRequest(
        @NotNull Long doctorId,
        @NotNull Long hospitalId,
        @NotBlank @Pattern(regexp = ValidationPatterns.DAY, message = "must be MON, TUE, WED, THU, FRI, SAT or SUN") String dayOfWeek,
        @NotBlank @Pattern(regexp = ValidationPatterns.TIME, message = ValidationPatterns.TIME_MESSAGE) String startTime,
        @NotBlank @Pattern(regexp = ValidationPatterns.TIME, message = ValidationPatterns.TIME_MESSAGE) String endTime,
        @NotNull @Min(1) @Max(100) Integer maxPatients) {
}
