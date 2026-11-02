package lk.medicare.controller;

import jakarta.validation.Valid;
import lk.medicare.dto.Schedule;
import lk.medicare.dto.ScheduleRequest;
import lk.medicare.dto.SessionAvailability;
import lk.medicare.service.ScheduleService;
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

@RestController
@RequestMapping("/api/schedules")
public class ScheduleController {

    private final ScheduleService service;

    public ScheduleController(ScheduleService service) {
        this.service = service;
    }

    @GetMapping
    public List<Schedule> list(@RequestParam(required = false) Long doctorId,
                               @RequestParam(required = false) Long hospitalId,
                               @RequestParam(required = false) Long specializationId,
                               @RequestParam(required = false) String day) {
        return service.findAll(doctorId, hospitalId, specializationId, day);
    }

    @GetMapping("/{id}")
    public Schedule get(@PathVariable long id) {
        return service.get(id);
    }

    /** Upcoming session dates with free slots, used by the booking screen. */
    @GetMapping("/{id}/sessions")
    public List<SessionAvailability> sessions(@PathVariable long id,
                                              @RequestParam(defaultValue = "4") int weeks) {
        return service.upcomingSessions(id, Math.min(Math.max(weeks, 1), 12));
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public Schedule create(@Valid @RequestBody ScheduleRequest request) {
        return service.create(request);
    }

    @PutMapping("/{id}")
    public Schedule update(@PathVariable long id, @Valid @RequestBody ScheduleRequest request) {
        return service.update(id, request);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable long id) {
        service.delete(id);
    }
}
