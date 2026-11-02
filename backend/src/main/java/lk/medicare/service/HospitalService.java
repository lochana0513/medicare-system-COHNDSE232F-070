package lk.medicare.service;

import lk.medicare.dto.Hospital;
import lk.medicare.dto.HospitalRequest;
import lk.medicare.exception.NotFoundException;
import lk.medicare.repository.HospitalRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class HospitalService {

    private final HospitalRepository repository;

    public HospitalService(HospitalRepository repository) {
        this.repository = repository;
    }

    public List<Hospital> findAll(String city) {
        return repository.findAll(city);
    }

    public Hospital get(long id) {
        return repository.findById(id).orElseThrow(() -> new NotFoundException("Hospital", id));
    }

    @Transactional
    public Hospital create(HospitalRequest request) {
        return get(repository.insert(request));
    }

    @Transactional
    public Hospital update(long id, HospitalRequest request) {
        if (repository.update(id, request) == 0) {
            throw new NotFoundException("Hospital", id);
        }
        return get(id);
    }

    @Transactional
    public void delete(long id) {
        if (repository.delete(id) == 0) {
            throw new NotFoundException("Hospital", id);
        }
    }
}
