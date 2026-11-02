package lk.medicare.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record SpecializationRequest(
        @NotBlank @Size(max = 60) String name,
        @Size(max = 250) String description) {
}
