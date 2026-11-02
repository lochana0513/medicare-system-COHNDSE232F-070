package lk.medicare.dto;

import com.fasterxml.jackson.annotation.JsonInclude;

import java.time.LocalDate;
import java.util.List;

public record Consultation(
        Long consultationId,
        Long appointmentId,
        LocalDate consultationDate,
        String symptoms,
        String diagnosis,
        String notes,
        LocalDate followUpDate,
        Long patientId,
        String patientName,
        Long doctorId,
        String doctorName,
        String specialization,
        String hospitalName,
        Integer itemCount,
        @JsonInclude(JsonInclude.Include.NON_NULL) List<PrescriptionItem> items) {

    public Consultation withItems(List<PrescriptionItem> prescriptionItems) {
        return new Consultation(consultationId, appointmentId, consultationDate, symptoms, diagnosis, notes,
                followUpDate, patientId, patientName, doctorId, doctorName, specialization, hospitalName,
                prescriptionItems.size(), prescriptionItems);
    }
}
