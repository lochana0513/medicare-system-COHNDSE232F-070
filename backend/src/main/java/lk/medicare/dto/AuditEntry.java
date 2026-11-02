package lk.medicare.dto;

import java.time.LocalDateTime;

public record AuditEntry(
        Long auditId,
        String oldStatus,
        String newStatus,
        String changedBy,
        LocalDateTime changedAt) {
}
