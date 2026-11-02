package lk.medicare.controller;

import jakarta.validation.Valid;
import lk.medicare.dto.Appointment;
import lk.medicare.dto.AuditEntry;
import lk.medicare.dto.BookAppointmentRequest;
import lk.medicare.dto.Consultation;
import lk.medicare.dto.ConsultationRequest;
import lk.medicare.dto.PaymentRequest;
import lk.medicare.repository.AppointmentRepository;
import lk.medicare.service.AppointmentService;
import lk.medicare.service.ConsultationService;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/appointments")
public class AppointmentController {

    /** Name of the person using the app, stored in the audit trail. */
    static final String USER_HEADER = "X-User";
    static final String DEFAULT_USER = "WEB_APP";

    private final AppointmentService service;
    private final ConsultationService consultationService;

    public AppointmentController(AppointmentService service, ConsultationService consultationService) {
        this.service = service;
        this.consultationService = consultationService;
    }

    @GetMapping
    public List<Appointment> list(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) Long patientId,
            @RequestParam(required = false) Long doctorId,
            @RequestParam(required = false) Long hospitalId,
            @RequestParam(required = false) Long scheduleId,
            @RequestParam(required = false) String q) {
        return service.findAll(new AppointmentRepository.Filter(
                date, from, to, status, patientId, doctorId, hospitalId, scheduleId, q));
    }

    @GetMapping("/{id}")
    public Appointment get(@PathVariable long id) {
        return service.get(id);
    }

    @GetMapping("/{id}/audit")
    public List<AuditEntry> audit(@PathVariable long id) {
        return service.audit(id);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public Appointment book(@Valid @RequestBody BookAppointmentRequest request,
                            @RequestHeader(value = USER_HEADER, defaultValue = DEFAULT_USER) String user) {
        return service.book(request, user);
    }

    @PostMapping("/{id}/confirm")
    public Appointment confirm(@PathVariable long id,
                               @RequestHeader(value = USER_HEADER, defaultValue = DEFAULT_USER) String user) {
        return service.confirm(id, user);
    }

    @PostMapping("/{id}/cancel")
    public Appointment cancel(@PathVariable long id,
                              @RequestHeader(value = USER_HEADER, defaultValue = DEFAULT_USER) String user) {
        return service.cancel(id, user);
    }

    @PostMapping("/{id}/payment")
    public Appointment pay(@PathVariable long id,
                           @Valid @RequestBody(required = false) PaymentRequest request,
                           @RequestHeader(value = USER_HEADER, defaultValue = DEFAULT_USER) String user) {
        return service.pay(id, request == null ? null : request.paymentMethod(), user);
    }

    @PostMapping("/{id}/consultation")
    @ResponseStatus(HttpStatus.CREATED)
    public Consultation recordConsultation(@PathVariable long id,
                                           @Valid @RequestBody ConsultationRequest request,
                                           @RequestHeader(value = USER_HEADER, defaultValue = DEFAULT_USER) String user) {
        return consultationService.record(id, request, user);
    }

    @PostMapping("/mark-no-shows")
    public Map<String, Integer> markNoShows(
            @RequestHeader(value = USER_HEADER, defaultValue = DEFAULT_USER) String user) {
        return Map.of("updated", service.markPastNoShows(user));
    }
}
