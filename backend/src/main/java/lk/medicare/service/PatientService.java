package lk.medicare.service;

import lk.medicare.dto.Patient;
import lk.medicare.dto.PatientRequest;
import lk.medicare.exception.NotFoundException;
import lk.medicare.repository.PatientRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class PatientService {

    private final PatientRepository repository;

    public PatientService(PatientRepository repository) {
        this.repository = repository;
    }

    public List<Patient> findAll(String search) {
        return repository.findAll(search);
    }

    public Patient get(long id) {
        return repository.findById(id).orElseThrow(() -> new NotFoundException("Patient", id));
    }

    @Transactional
    public Patient register(PatientRequest request) {
        return get(repository.register(request));
    }

    @Transactional
    public Patient update(long id, PatientRequest request) {
        if (repository.update(id, request) == 0) {
            throw new NotFoundException("Patient", id);
        }
        return get(id);
    }

    @Transactional
    public void delete(long id) {
        if (repository.delete(id) == 0) {
            throw new NotFoundException("Patient", id);
        }
    }
}
