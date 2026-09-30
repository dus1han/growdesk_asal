namespace DoctorCrm.Api.DTOs;

public class BookingQuery
{
    /// <summary>Inclusive clinic-local date range (calendar view).</summary>
    public DateOnly? From { get; set; }
    public DateOnly? To { get; set; }
    public int? CustomerId { get; set; }
    public int? DoctorId { get; set; }
    /// <summary>Comma-separated statuses, e.g. "Booked,Completed".</summary>
    public string? Status { get; set; }
    public int Page { get; set; } = 1;
    public int PageSize { get; set; } = 50;
    /// <summary>"asc" (default, upcoming first) or "desc" (history).</summary>
    public string? Sort { get; set; }
}

public record BookingListItemDto(
    int Id,
    NamedRef Customer,
    NamedRef? Doctor,
    DateOnly Date,
    TimeOnly StartTime,
    TimeOnly EndTime,
    string Status,
    IReadOnlyList<NamedRef> Treatments,
    decimal? ConsultationCharge,
    string? PaymentStatus);

public record PaymentDto(
    int Id,
    decimal Amount,
    string Status,
    NamedRef? Method,
    DateTime? PaymentDate,
    string? RecordedBy,
    DateTime CreatedAt);

public record BookingLinkDto(int Id, DateOnly Date, TimeOnly StartTime, string Status);

public record BookingDetailDto(
    int Id,
    NamedRef Customer,
    string? CustomerWhatsApp,
    StageRef CustomerStage,
    NamedRef? Doctor,
    DateOnly Date,
    TimeOnly StartTime,
    TimeOnly EndTime,
    string Status,
    IReadOnlyList<NamedRef> Treatments,
    string? Notes,
    decimal? ConsultationCharge,
    string? DoctorNotes,
    DateOnly? NextTreatmentDate,
    NamedRef? NextTreatment,
    NamedRef? CancellationReason,
    string? CancellationNote,
    BookingLinkDto? RescheduledFrom,
    BookingLinkDto? RescheduledTo,
    IReadOnlyList<PaymentDto> Payments,
    DateTime? CompletedAt,
    DateTime? CancelledAt,
    DateTime? RescheduledAt,
    DateTime? NoShowAt,
    DateTime CreatedAt);

public record CreateBookingRequest(
    int CustomerId,
    int? DoctorId,
    DateOnly Date,
    TimeOnly StartTime,
    TimeOnly EndTime,
    IReadOnlyList<int> TreatmentIds,
    string? Notes);

/// <summary>Edits a booked consultation's treatments, doctor and notes. Time changes go through reschedule.</summary>
public record UpdateBookingRequest(int? DoctorId, IReadOnlyList<int> TreatmentIds, string? Notes);

public record CompleteBookingRequest(
    decimal ConsultationCharge,
    string PaymentStatus,
    int? PaymentMethodId,
    DateOnly? NextTreatmentDate,
    int? NextTreatmentId,
    string? DoctorNotes);

public record RescheduleBookingRequest(DateOnly Date, TimeOnly StartTime, TimeOnly EndTime, int? DoctorId);

public record CancelBookingRequest(int CancellationReasonId, string? Note);

/// <summary>Returned with a 409 when the chosen time overlaps another booked consultation.</summary>
public record BookingConflictDto(int BookingId, string CustomerName, TimeOnly StartTime, TimeOnly EndTime);

public record LocaleDto(string Currency, string TimeZone, DateOnly Today);
