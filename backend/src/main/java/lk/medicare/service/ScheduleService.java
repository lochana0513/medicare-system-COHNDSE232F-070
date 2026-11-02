package lk.medicare.service;

import lk.medicare.dto.Schedule;
import lk.medicare.dto.ScheduleRequest;
import lk.medicare.dto.SessionAvailability;
import lk.medicare.exception.NotFoundException;
import lk.medicare.repository.ScheduleRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.temporal.TemporalAdjusters;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@Service
public class ScheduleService {

    private static final Map<String, DayOfWeek> DAYS = Map.of(
            "MON", DayOfWeek.MONDAY, "TUE", DayOfWeek.TUESDAY, "WED", DayOfWeek.WEDNESDAY,
            "THU", DayOfWeek.THURSDAY, "FRI", DayOfWeek.FRIDAY, "SAT", DayOfWeek.SATURDAY,
            "SUN", DayOfWeek.SUNDAY);

    private final ScheduleRepository repository;

    public ScheduleService(ScheduleRepository repository) {
        this.repository = repository;
    }

    public List<Schedule> findAll(Long doctorId, Long hospitalId, Long specializationId, String day) {
        return repository.findAll(doctorId, hospitalId, specializationId, day);
    }

    public Schedule get(long id) {
        return repository.findById(id).orElseThrow(() -> new NotFoundException("Schedule", id));
    }

    /** The next {@code weeks} dates this session runs on, with the free slots for each. */
    public List<SessionAvailability> upcomingSessions(long id, int weeks) {
        Schedule schedule = get(id);
        LocalDate date = LocalDate.now().with(TemporalAdjusters.nextOrSame(DAYS.get(schedule.dayOfWeek())));
        List<SessionAvailability> sessions = new ArrayList<>();
        for (int i = 0; i < weeks; i++) {
            sessions.add(new SessionAvailability(id, date, schedule.maxPatients(),
                    repository.availableSlots(id, date)));
            date = date.plusWeeks(1);
        }
        return sessions;
    }

    @Transactional
    public Schedule create(ScheduleRequest request) {
        return get(repository.insert(request));
    }

    @Transactional
    public Schedule update(long id, ScheduleRequest request) {
        if (repository.update(id, request) == 0) {
            throw new NotFoundException("Schedule", id);
        }
        return get(id);
    }

    @Transactional
    public void delete(long id) {
        if (repository.delete(id) == 0) {
            throw new NotFoundException("Schedule", id);
        }
    }
}
