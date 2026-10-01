using DoctorCrm.Api.Authentication;
using DoctorCrm.Api.Authorization;
using DoctorCrm.Api.DTOs;
using DoctorCrm.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace DoctorCrm.Api.Controllers;

/// <summary>
/// The WhatsApp BOT API. The bot exchanges a Bot connection's client ID and secret for a
/// 15-minute token at <c>POST /api/bot/token</c>, then sends it as <c>Authorization: Bearer …</c>.
/// Dates are yyyy-MM-dd and times HH:mm in the clinic's time zone. See docs/BOT_API.md.
/// </summary>
[ApiController]
[Route("api/bot")]
[Authorize(Policy = CaptureAuth.BotPolicy)]
[EnableRateLimiting(RateLimitPolicies.Capture)]
public class BotController(CaptureClientService clients, BotService bot) : ControllerBase
{
    private string Client => User.Identity?.Name ?? "WhatsApp BOT";

    /// <summary>Exchanges a Bot connection's client ID and secret for a 15-minute access token.</summary>
    [HttpPost("token")]
    [AllowAnonymous]
    [EnableRateLimiting(RateLimitPolicies.CaptureToken)]
    public async Task<ActionResult<ApiResponse<CaptureTokenDto>>> Token(CaptureTokenRequest request, CancellationToken ct)
    {
        var token = await clients.IssueTokenAsync(request, HttpContext.Connection.RemoteIpAddress?.ToString(), null, ct);
        return token is null
            ? Unauthorized(ApiResponse.Fail("Invalid client ID or secret, or the connection was revoked."))
            : Ok(ApiResponse<CaptureTokenDto>.Ok(token));
    }

    /// <summary>Treatments that can be booked, in display order.</summary>
    [HttpGet("treatments")]
    public async Task<ActionResult<ApiResponse<IReadOnlyList<BotTreatmentDto>>>> Treatments(CancellationToken ct) =>
        Ok(ApiResponse<IReadOnlyList<BotTreatmentDto>>.Ok(await bot.TreatmentsAsync(ct)));

    /// <summary>Free start times on a day (every 15 minutes, within opening hours, clear of other bookings).</summary>
    [HttpGet("availability")]
    public async Task<ActionResult<ApiResponse<BotAvailabilityDto>>> Availability([FromQuery] string? date, CancellationToken ct) =>
        Ok(ApiResponse<BotAvailabilityDto>.Ok(await bot.AvailabilityAsync(date, ct)));

    /// <summary>Saves an interested lead (no booking): finds the customer by WhatsApp number or creates them.</summary>
    [HttpPost("customers")]
    public async Task<ActionResult<ApiResponse<BotLeadResultDto>>> Customers(BotLeadRequest request, CancellationToken ct)
    {
        var result = await bot.LeadAsync(request, Client, ct);
        return Ok(ApiResponse<BotLeadResultDto>.Ok(result, result.Action == "created" ? $"{result.CustomerName} was added." : $"{result.CustomerName} was updated."));
    }

    /// <summary>The customer's upcoming booked consultations.</summary>
    [HttpGet("bookings")]
    public async Task<ActionResult<ApiResponse<IReadOnlyList<BotBookingDto>>>> Bookings([FromQuery] string? whatsapp, CancellationToken ct) =>
        Ok(ApiResponse<IReadOnlyList<BotBookingDto>>.Ok(await bot.UpcomingAsync(whatsapp, ct)));

    /// <summary>Books a consultation for a customer saved earlier with POST /customers.</summary>
    [HttpPost("bookings")]
    public async Task<ActionResult<ApiResponse<BotBookingResultDto>>> Book(BotBookingRequest request, CancellationToken ct)
    {
        var result = await bot.BookAsync(request, Client, ct);
        return Ok(ApiResponse<BotBookingResultDto>.Ok(result, $"Booked {result.Booking.CustomerName} for {result.Booking.Date} {result.Booking.StartTime}."));
    }

    /// <summary>Moves a booked consultation and/or changes its treatments or notes.</summary>
    [HttpPatch("bookings/{id:int}")]
    public async Task<ActionResult<ApiResponse<BotBookingResultDto>>> Update(int id, BotBookingUpdateRequest request, CancellationToken ct)
    {
        var result = await bot.UpdateAsync(id, request, Client, ct);
        return Ok(ApiResponse<BotBookingResultDto>.Ok(result, result.Action == "rescheduled"
            ? $"Moved to {result.Booking.Date} {result.Booking.StartTime}."
            : "Booking updated."));
    }
}

/// <summary>Admin: weekly opening hours and the bot's booking length.</summary>
[ApiController]
[Route("api/admin/booking-hours")]
[HasPermission(Permissions.SettingsManage)]
public class BookingHoursController(BookingHoursService hours) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<ApiResponse<BookingHoursDto>>> Get(CancellationToken ct) =>
        Ok(ApiResponse<BookingHoursDto>.Ok(await hours.GetAsync(ct)));

    [HttpPut]
    public async Task<ActionResult<ApiResponse<BookingHoursDto>>> Save(BookingHoursDto request, CancellationToken ct) =>
        Ok(ApiResponse<BookingHoursDto>.Ok(await hours.SaveAsync(request, User.GetUserId(), ct), "Opening hours saved."));
}
