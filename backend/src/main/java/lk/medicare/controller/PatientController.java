package lk.medicare.controller;

import jakarta.validation.Valid;
import lk.medicare.dto.Appointment;
import lk.medicare.dto.Patient;
import lk.medicare.dto.PatientRequest;
import lk.medicare.repository.AppointmentRepository;
import lk.medicare.service.AppointmentService;
import lk.medicare.service.PatientService;
import lk.medicare.service.ReportService;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/patients")
public class PatientController {

    private final PatientService service;
    private final AppointmentService appointmentService;
    private final ReportService reportService;

    public PatientController(PatientService service, AppointmentService appointmentService,
                             ReportService reportService) {
        this.service = service;
        this.appointmentService = appointmentService;
        this.reportService = reportService;
    }

    @GetMapping
    public List<Patient> list(@RequestParam(required = false) String q) {
        return service.findAll(q);
    }

    @GetMapping("/{id}")
    public Patient get(@PathVariable long id) {
        return service.get(id);
    }

    @GetMapping("/{id}/appointments")
    public List<Appointment> appointments(@PathVariable long id) {
        service.get(id);
        return appointmentService.findAll(
                new AppointmentRepository.Filter(null, null, null, null, id, null, null, null, null));
    }

    @GetMapping("/{id}/history")
    public List<Map<String, Object>> history(@PathVariable long id) {
        service.get(id);
        return reportService.patientHistory(id);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public Patient register(@Valid @RequestBody PatientRequest request) {
        return service.register(request);
    }

    @PutMapping("/{id}")
    public Patient update(@PathVariable long id, @Valid @RequestBody PatientRequest request) {
        return service.update(id, request);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable long id) {
        service.delete(id);
    }
}
