package lk.medicare.controller;

import jakarta.validation.Valid;
import lk.medicare.dto.Consultation;
import lk.medicare.dto.PrescriptionItemRequest;
import lk.medicare.service.ConsultationService;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/consultations")
public class ConsultationController {

    private final ConsultationService service;

    public ConsultationController(ConsultationService service) {
        this.service = service;
    }

    @GetMapping
    public List<Consultation> list(@RequestParam(required = false) Long patientId,
                                   @RequestParam(required = false) Long doctorId,
                                   @RequestParam(required = false) String q) {
        return service.findAll(patientId, doctorId, q);
    }

    @GetMapping("/{id}")
    public Consultation get(@PathVariable long id) {
        return service.get(id);
    }

    @PostMapping("/{id}/items")
    @ResponseStatus(HttpStatus.CREATED)
    public Consultation addItem(@PathVariable long id, @Valid @RequestBody PrescriptionItemRequest request) {
        return service.addItem(id, request);
    }

    @DeleteMapping("/{id}/items/{itemId}")
    public Consultation deleteItem(@PathVariable long id, @PathVariable long itemId) {
        return service.deleteItem(id, itemId);
    }
}
