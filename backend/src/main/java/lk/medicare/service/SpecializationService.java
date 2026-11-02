package lk.medicare.service;

import lk.medicare.dto.Specialization;
import lk.medicare.dto.SpecializationRequest;
import lk.medicare.exception.NotFoundException;
import lk.medicare.repository.SpecializationRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class SpecializationService {

    private final SpecializationRepository repository;

    public SpecializationService(SpecializationRepository repository) {
        this.repository = repository;
    }

    public List<Specialization> findAll() {
        return repository.findAll();
    }

    public Specialization get(long id) {
        return repository.findById(id).orElseThrow(() -> new NotFoundException("Specialization", id));
    }

    @Transactional
    public Specialization create(SpecializationRequest request) {
        return get(repository.insert(request));
    }

    @Transactional
    public Specialization update(long id, SpecializationRequest request) {
        if (repository.update(id, request) == 0) {
            throw new NotFoundException("Specialization", id);
        }
        return get(id);
    }

    @Transactional
    public void delete(long id) {
        if (repository.delete(id) == 0) {
            throw new NotFoundException("Specialization", id);
        }
    }
}
