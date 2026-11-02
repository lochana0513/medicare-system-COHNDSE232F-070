package lk.medicare.service;

import lk.medicare.dto.Consultation;
import lk.medicare.dto.ConsultationRequest;
import lk.medicare.dto.PrescriptionItemRequest;
import lk.medicare.exception.NotFoundException;
import lk.medicare.repository.ConsultationRepository;
import lk.medicare.repository.support.OracleJdbcSupport;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class ConsultationService {

    private final ConsultationRepository repository;
    private final OracleJdbcSupport oracle;

    public ConsultationService(ConsultationRepository repository, OracleJdbcSupport oracle) {
        this.repository = repository;
        this.oracle = oracle;
    }

    public List<Consultation> findAll(Long patientId, Long doctorId, String search) {
        return repository.findAll(patientId, doctorId, search);
    }

    public Consultation get(long id) {
        Consultation consultation = repository.findById(id)
                .orElseThrow(() -> new NotFoundException("Consultation", id));
        return consultation.withItems(repository.findItems(id));
    }

    /** Records the consultation and its prescription in one transaction. */
    @Transactional
    public Consultation record(long appointmentId, ConsultationRequest request, String user) {
        long id = oracle.asUser(user, () -> {
            long consultationId = repository.record(appointmentId, request);
            if (request.items() != null) {
                for (PrescriptionItemRequest item : request.items()) {
                    repository.addItem(consultationId, item);
                }
            }
            return consultationId;
        });
        return get(id);
    }

    @Transactional
    public Consultation addItem(long consultationId, PrescriptionItemRequest request) {
        repository.addItem(consultationId, request);
        return get(consultationId);
    }

    @Transactional
    public Consultation deleteItem(long consultationId, long itemId) {
        if (repository.deleteItem(consultationId, itemId) == 0) {
            throw new NotFoundException("Prescription item", itemId);
        }
        return get(consultationId);
    }
}
