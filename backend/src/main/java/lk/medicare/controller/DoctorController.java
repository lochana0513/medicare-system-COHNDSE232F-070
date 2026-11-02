package lk.medicare.controller;

import jakarta.validation.Valid;
import lk.medicare.dto.Doctor;
import lk.medicare.dto.DoctorRequest;
import lk.medicare.dto.Schedule;
import lk.medicare.dto.StatusRequest;
import lk.medicare.service.DoctorService;
import lk.medicare.service.ScheduleService;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/doctors")
public class DoctorController {

    private final DoctorService service;
    private final ScheduleService scheduleService;

    public DoctorController(DoctorService service, ScheduleService scheduleService) {
        this.service = service;
        this.scheduleService = scheduleService;
    }

    @GetMapping
    public List<Doctor> list(@RequestParam(required = false) Long specializationId,
                             @RequestParam(required = false) String status,
                             @RequestParam(required = false) String q) {
        return service.findAll(specializationId, status, q);
    }

    @GetMapping("/{id}")
    public Doctor get(@PathVariable long id) {
        return service.get(id);
    }

    @GetMapping("/{id}/schedules")
    public List<Schedule> schedules(@PathVariable long id) {
        service.get(id);
        return scheduleService.findAll(id, null, null, null);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public Doctor create(@Valid @RequestBody DoctorRequest request) {
        return service.create(request);
    }

    @PutMapping("/{id}")
    public Doctor update(@PathVariable long id, @Valid @RequestBody DoctorRequest request) {
        return service.update(id, request);
    }

    @PatchMapping("/{id}/status")
    public Doctor updateStatus(@PathVariable long id, @Valid @RequestBody StatusRequest request) {
        return service.updateStatus(id, request.status());
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable long id) {
        service.delete(id);
    }
}
