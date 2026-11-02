package lk.medicare.controller;

import jakarta.validation.Valid;
import lk.medicare.dto.Specialization;
import lk.medicare.dto.SpecializationRequest;
import lk.medicare.service.SpecializationService;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/specializations")
public class SpecializationController {

    private final SpecializationService service;

    public SpecializationController(SpecializationService service) {
        this.service = service;
    }

    @GetMapping
    public List<Specialization> list() {
        return service.findAll();
    }

    @GetMapping("/{id}")
    public Specialization get(@PathVariable long id) {
        return service.get(id);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public Specialization create(@Valid @RequestBody SpecializationRequest request) {
        return service.create(request);
    }

    @PutMapping("/{id}")
    public Specialization update(@PathVariable long id, @Valid @RequestBody SpecializationRequest request) {
        return service.update(id, request);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable long id) {
        service.delete(id);
    }
}
