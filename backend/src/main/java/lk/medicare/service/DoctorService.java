package lk.medicare.service;

import lk.medicare.dto.Doctor;
import lk.medicare.dto.DoctorRequest;
import lk.medicare.exception.NotFoundException;
import lk.medicare.repository.DoctorRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class DoctorService {

    private final DoctorRepository repository;

    public DoctorService(DoctorRepository repository) {
        this.repository = repository;
    }

    public List<Doctor> findAll(Long specializationId, String status, String search) {
        return repository.findAll(specializationId, status, search);
    }

    public Doctor get(long id) {
        return repository.findById(id).orElseThrow(() -> new NotFoundException("Doctor", id));
    }

    @Transactional
    public Doctor create(DoctorRequest request) {
        return get(repository.insert(request));
    }

    @Transactional
    public Doctor update(long id, DoctorRequest request) {
        if (repository.update(id, request) == 0) {
            throw new NotFoundException("Doctor", id);
        }
        return get(id);
    }

    @Transactional
    public Doctor updateStatus(long id, String status) {
        if (repository.updateStatus(id, status) == 0) {
            throw new NotFoundException("Doctor", id);
        }
        return get(id);
    }

    @Transactional
    public void delete(long id) {
        if (repository.delete(id) == 0) {
            throw new NotFoundException("Doctor", id);
        }
    }
}
