namespace DoctorCrm.Api.DTOs;

// ---- Opening hours (admin) -------------------------------------------------------------------

/// <summary>One weekday. <c>From</c>/<c>To</c> are "HH:mm" in the clinic's time zone, set when open.</summary>
public record OpeningDayDto(string Day, bool IsOpen, string? From, string? To);

/// <summary>The weekly opening hours the WhatsApp BOT books within, and its booking length.</summary>
public record BookingHoursDto(int BotBookingMinutes, IReadOnlyList<OpeningDayDto> Days);

// ---- WhatsApp BOT API ------------------------------------------------------------------------
// Dates are "yyyy-MM-dd" and times "HH:mm", both in the clinic's time zone. They are plain
// strings so a bot gets a clear message for a badly written value, not a generic parse error.

public record BotTreatmentDto(int Id, string Name, string? Description);

/// <summary>The start times still free on a day for one bot-length consultation.</summary>
public record BotAvailabilityDto(string Date, bool Open, string? OpensAt, string? ClosesAt, int DurationMinutes, IReadOnlyList<string> FreeTimes);

/// <summary>An interested lead: no booking yet.</summary>
public record BotLeadRequest(string? Name, string? WhatsApp, IReadOnlyList<int>? TreatmentIds, string? Notes);

/// <summary><c>Action</c> is "created" or "updated" (the WhatsApp number was already known).</summary>
public record BotLeadResultDto(int CustomerId, string Action, string CustomerName);

/// <summary>Books a consultation for a customer already saved with POST /customers (found by WhatsApp number).</summary>
public record BotBookingRequest(string? WhatsApp, IReadOnlyList<int>? TreatmentIds, string? Date, string? StartTime, string? Notes);

/// <summary>
/// Changes a booked consultation. <c>WhatsApp</c> must be the booking customer's number. Send
/// <c>Date</c> and <c>StartTime</c> together to move it; send <c>TreatmentIds</c> and/or <c>Notes</c>
/// to change those. Anything left out stays as it is.
/// </summary>
public record BotBookingUpdateRequest(string? WhatsApp, string? Date, string? StartTime, IReadOnlyList<int>? TreatmentIds, string? Notes);

/// <summary>Cancels a booked consultation. <c>WhatsApp</c> must be the booking customer's number; <c>Note</c> is optional (≤500).</summary>
public record BotCancelRequest(string? WhatsApp, string? Note);

public record BotTreatmentRef(int Id, string Name);

public record BotBookingDto(
    int BookingId,
    int CustomerId,
    string CustomerName,
    string Date,
    string StartTime,
    string EndTime,
    IReadOnlyList<BotTreatmentRef> Treatments,
    string Status,
    string? Notes);

/// <summary>
/// <c>Action</c>: "booked", "updated", "rescheduled" or "cancelled". A reschedule creates a new booking (the
/// old one is kept as Rescheduled), so <c>Booking.BookingId</c> is then the new ID and
/// <c>PreviousBookingId</c> the old one.
/// </summary>
public record BotBookingResultDto(string Action, BotBookingDto Booking, int? PreviousBookingId);

/// <summary>Returned with a 409 when the requested time is taken: other free times that day.</summary>
public record BotSlotTakenDto(string Date, string RequestedTime, IReadOnlyList<string> FreeTimes);

// ---- Live updates (GrowDesk screens) ------------------------------------------------------------

/// <summary>Pushed to open GrowDesk screens when the bot books or moves a consultation.</summary>
public record LiveBookingEventDto(
    string Type,
    int BookingId,
    int CustomerId,
    string CustomerName,
    bool NewCustomer,
    DateOnly Date,
    TimeOnly StartTime,
    TimeOnly EndTime,
    IReadOnlyList<string> Treatments,
    string Source,
    DateTime CreatedAt);

// ---- Calendar: opening hours and blocked time ----------------------------------------------------

/// <summary>Not-available time: every day from StartDate to EndDate, all day when the times are null.</summary>
public record CalendarBlockDto(
    int Id,
    DateOnly StartDate,
    DateOnly EndDate,
    TimeOnly? StartTime,
    TimeOnly? EndTime,
    string? Reason,
    string? CreatedBy,
    DateTime CreatedAt);

/// <summary>Leave <c>EndDate</c> empty for one day, and both times empty for the whole day.</summary>
public record CreateCalendarBlockRequest(DateOnly StartDate, DateOnly? EndDate, TimeOnly? StartTime, TimeOnly? EndTime, string? Reason);

/// <summary><c>BookedConsultations</c>: consultations already booked in that time, which stay booked.</summary>
public record CalendarBlockCreatedDto(CalendarBlockDto Block, int BookedConsultations);
