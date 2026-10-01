using DoctorCrm.Api.Authentication;
using DoctorCrm.Api.Authorization;
using DoctorCrm.Api.DTOs;
using DoctorCrm.Api.Services;
using Microsoft.AspNetCore.Mvc;

namespace DoctorCrm.Api.Controllers;

/// <summary>What the calendar shows besides bookings: opening hours and time marked not available.</summary>
[ApiController]
[Route("api/calendar")]
[HasPermission(Permissions.BookingsView)]
public class CalendarController(BookingHoursService hours, CalendarBlockService blocks) : ControllerBase
{
    /// <summary>The weekly opening hours, for shading closed time.</summary>
    [HttpGet("opening-hours")]
    public async Task<ActionResult<ApiResponse<BookingHoursDto>>> OpeningHours(CancellationToken ct) =>
        Ok(ApiResponse<BookingHoursDto>.Ok(await hours.GetAsync(ct)));

    /// <summary>Blocked time that overlaps from–to (inclusive dates).</summary>
    [HttpGet("blocks")]
    public async Task<ActionResult<ApiResponse<IReadOnlyList<CalendarBlockDto>>>> Blocks([FromQuery] DateOnly from, [FromQuery] DateOnly to, CancellationToken ct)
    {
        if (to < from || to.DayNumber - from.DayNumber > 400)
            return BadRequest(ApiResponse.Fail("Choose a date range of up to 400 days."));
        return Ok(ApiResponse<IReadOnlyList<CalendarBlockDto>>.Ok(await blocks.ListAsync(from, to, ct)));
    }

    [HttpPost("blocks")]
    [HasPermission(Permissions.BookingsManage)]
    public async Task<ActionResult<ApiResponse<CalendarBlockCreatedDto>>> Block(CreateCalendarBlockRequest request, CancellationToken ct) =>
        Ok(ApiResponse<CalendarBlockCreatedDto>.Ok(await blocks.CreateAsync(request, User.GetUserId(), ct), "Time blocked."));

    [HttpDelete("blocks/{id:int}")]
    [HasPermission(Permissions.BookingsManage)]
    public async Task<ActionResult<ApiResponse<object>>> Unblock(int id, CancellationToken ct)
    {
        await blocks.DeleteAsync(id, User.GetUserId(), ct);
        return Ok(ApiResponse.Ok("Time is available again."));
    }
}
