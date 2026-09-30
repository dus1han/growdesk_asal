using System.Text.Json;

namespace DoctorCrm.Api.DTOs;

/// <summary>
/// Everything the dashboard shows, in one call (spec §10, §11, §29). Sections the user may not
/// see are null rather than empty, so the page can leave them out instead of showing "none".
/// </summary>
public record DashboardDto(
    DateOnly Today,
    DashboardBookingStatsDto? Bookings,
    DashboardCustomerStatsDto? Customers,
    IReadOnlyList<DashboardAppointmentDto>? TodaysAppointments,
    IReadOnlyList<DashboardStageDto>? Stages,
    IReadOnlyList<DashboardFollowUpDto>? FollowUps,
    IReadOnlyList<DashboardActivityDto>? Activity);

/// <summary>Consultation counts. Cancelled and rescheduled bookings are not counted as consultations.</summary>
public record DashboardBookingStatsDto(
    int Today,
    int Yesterday,
    int StillBookedToday,
    int Upcoming,
    int UpcomingThisWeek);

/// <summary>
/// FollowUpsDue: follow-up date today or earlier. Potential: customers in the Interested or
/// Follow-up stage. NewToday: customers added today.
/// </summary>
public record DashboardCustomerStatsDto(int FollowUpsDue, int FollowUpsOverdue, int Potential, int NewToday);

public record DashboardAppointmentDto(
    int Id,
    TimeOnly StartTime,
    TimeOnly EndTime,
    string Status,
    NamedRef Customer,
    IReadOnlyList<string> Treatments,
    string? DoctorName);

public record DashboardStageDto(int Id, string Name, string Color, string? SystemKey, int Count);

public record DashboardFollowUpDto(
    int Id,
    string Name,
    string? WhatsApp,
    DateOnly Date,
    StageRef Stage,
    IReadOnlyList<string> Treatments);

public record DashboardActivityDto(
    long Id,
    string Action,
    string? UserName,
    DateTime CreatedAt,
    JsonElement? Details,
    NamedRef? Customer,
    int? BookingId);
