namespace DoctorCrm.Api.Entities;

/// <summary>
/// Time marked as not available on the calendar (doctor away, holiday, staff meeting). It covers
/// every day from <see cref="StartDate"/> to <see cref="EndDate"/>: the whole day when no times are
/// set, otherwise <see cref="StartTime"/>–<see cref="EndTime"/> on each of those days. Nothing can
/// be booked over it, by staff or by the WhatsApp BOT.
/// </summary>
public class CalendarBlock : AuditableEntity
{
    public int Id { get; set; }

    /// <summary>Clinic-local dates, inclusive.</summary>
    public DateOnly StartDate { get; set; }
    public DateOnly EndDate { get; set; }

    /// <summary>Both set, or both null for the whole day.</summary>
    public TimeOnly? StartTime { get; set; }
    public TimeOnly? EndTime { get; set; }

    public string? Reason { get; set; }

    public int? CreatedById { get; set; }
    public User? CreatedBy { get; set; }
}
