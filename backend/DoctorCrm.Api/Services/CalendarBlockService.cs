using DoctorCrm.Api.Data;
using DoctorCrm.Api.DTOs;
using DoctorCrm.Api.Entities;
using Microsoft.EntityFrameworkCore;

namespace DoctorCrm.Api.Services;

/// <summary>Not-available time on the calendar. Removing a block simply frees the time again.</summary>
public class CalendarBlockService(AppDbContext db, AuditService audit)
{
    /// <summary>Longest a single block may run, so a typo can't close the clinic for years.</summary>
    public const int MaxDays = 366;

    public async Task<IReadOnlyList<CalendarBlockDto>> ListAsync(DateOnly from, DateOnly to, CancellationToken ct) =>
        await db.CalendarBlocks.AsNoTracking()
            .Where(b => b.StartDate <= to && b.EndDate >= from)
            .OrderBy(b => b.StartDate).ThenBy(b => b.StartTime)
            .Select(b => new CalendarBlockDto(b.Id, b.StartDate, b.EndDate, b.StartTime, b.EndTime, b.Reason,
                b.CreatedBy != null ? b.CreatedBy.FullName : null, b.CreatedAt))
            .ToListAsync(ct);

    public async Task<CalendarBlockCreatedDto> CreateAsync(CreateCalendarBlockRequest r, int? userId, CancellationToken ct)
    {
        var end = r.EndDate ?? r.StartDate;
        if (end < r.StartDate) throw new BusinessRuleException("The end date can't be before the start date.", field: "endDate");
        if (end.DayNumber - r.StartDate.DayNumber >= MaxDays)
            throw new BusinessRuleException($"A block can cover at most {MaxDays} days.", field: "endDate");
        if ((r.StartTime is null) != (r.EndTime is null))
            throw new BusinessRuleException("Enter both times, or neither for the whole day.", field: r.StartTime is null ? "startTime" : "endTime");
        if (r.StartTime is { } s && r.EndTime is { } e && e <= s)
            throw new BusinessRuleException("The end time must be after the start time.", field: "endTime");
        var reason = r.Reason?.Trim();
        if (reason?.Length > 200) throw new BusinessRuleException("The reason can be at most 200 characters.", field: "reason");

        var block = new CalendarBlock
        {
            StartDate = r.StartDate,
            EndDate = end,
            StartTime = r.StartTime,
            EndTime = r.EndTime,
            Reason = string.IsNullOrEmpty(reason) ? null : reason,
            CreatedById = userId,
        };
        db.CalendarBlocks.Add(block);
        await db.SaveChangesAsync(ct);
        audit.Record(userId, "Calendar Time Blocked", nameof(CalendarBlock), block.Id,
            new { block.StartDate, block.EndDate, block.StartTime, block.EndTime, block.Reason });
        await db.SaveChangesAsync(ct);

        // Consultations already booked in that time stay booked; the user is told so they can move them.
        var affected = await db.Bookings.AsNoTracking()
            .Where(b => b.Status == BookingStatus.Booked && b.BookingDate >= block.StartDate && b.BookingDate <= block.EndDate
                        && (block.StartTime == null || (b.StartTime < block.EndTime && block.StartTime < b.EndTime)))
            .CountAsync(ct);

        var dto = (await ListAsync(block.StartDate, block.EndDate, ct)).Single(x => x.Id == block.Id);
        return new CalendarBlockCreatedDto(dto, affected);
    }

    public async Task DeleteAsync(int id, int? userId, CancellationToken ct)
    {
        var block = await db.CalendarBlocks.SingleOrDefaultAsync(b => b.Id == id, ct)
            ?? throw BusinessRuleException.NotFound("Blocked time");
        db.CalendarBlocks.Remove(block);
        audit.Record(userId, "Calendar Time Unblocked", nameof(CalendarBlock), id,
            new { block.StartDate, block.EndDate, block.StartTime, block.EndTime, block.Reason });
        await db.SaveChangesAsync(ct);
    }

    /// <summary>Blocks that cover any part of <paramref name="start"/>–<paramref name="end"/> on <paramref name="date"/>.</summary>
    public static IQueryable<CalendarBlock> Covering(IQueryable<CalendarBlock> blocks, DateOnly date, TimeOnly start, TimeOnly end) =>
        blocks.Where(b => b.StartDate <= date && b.EndDate >= date
                          && (b.StartTime == null || (b.StartTime < end && start < b.EndTime)));

    /// <summary>The blocked intervals on one day; a whole-day block is 00:00–23:59:59.</summary>
    public static async Task<List<(TimeOnly Start, TimeOnly End)>> OnDayAsync(AppDbContext db, DateOnly date, CancellationToken ct) =>
        (await db.CalendarBlocks.AsNoTracking()
            .Where(b => b.StartDate <= date && b.EndDate >= date)
            .Select(b => new { b.StartTime, b.EndTime })
            .ToListAsync(ct))
        .Select(b => (b.StartTime ?? TimeOnly.MinValue, b.EndTime ?? TimeOnly.MaxValue))
        .ToList();

    /// <summary>"Doctor away" or "blocked", for messages.</summary>
    public static string Describe(CalendarBlock block) =>
        string.IsNullOrEmpty(block.Reason) ? "marked as not available" : $"marked as not available ({block.Reason})";
}
