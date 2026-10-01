using System.Globalization;
using System.Text.Json;
using DoctorCrm.Api.Data;
using DoctorCrm.Api.DTOs;
using DoctorCrm.Api.Entities;
using Microsoft.EntityFrameworkCore;

namespace DoctorCrm.Api.Services;

/// <summary>
/// The clinic's weekly opening hours and the length of a consultation the WhatsApp BOT books.
/// Only the bot is held to the opening hours; staff can still book any time from GrowDesk.
/// </summary>
public class BookingHoursService(AppDbContext db, AuditService audit)
{
    public const int DefaultBotMinutes = 45;

    private static readonly DayOfWeek[] Week =
        [DayOfWeek.Monday, DayOfWeek.Tuesday, DayOfWeek.Wednesday, DayOfWeek.Thursday, DayOfWeek.Friday, DayOfWeek.Saturday, DayOfWeek.Sunday];

    /// <summary>Mon–Sat 09:00–18:00, Sunday closed, until an admin sets the real hours.</summary>
    public static IReadOnlyList<OpeningDayDto> DefaultDays { get; } =
        Week.Select(d => d == DayOfWeek.Sunday ? new OpeningDayDto(Name(d), false, null, null) : new OpeningDayDto(Name(d), true, "09:00", "18:00")).ToList();

    public static string DefaultDaysJson => JsonSerializer.Serialize(DefaultDays, JsonSerializerOptions.Web);

    public async Task<BookingHoursDto> GetAsync(CancellationToken ct)
    {
        var values = await db.SystemSettings.AsNoTracking()
            .Where(s => s.Key == SettingKeys.OpeningHours || s.Key == SettingKeys.BotBookingMinutes)
            .ToDictionaryAsync(s => s.Key, s => s.Value, ct);

        var minutes = int.TryParse(values.GetValueOrDefault(SettingKeys.BotBookingMinutes), out var m) && m > 0 ? m : DefaultBotMinutes;
        IReadOnlyList<OpeningDayDto>? days = null;
        if (values.GetValueOrDefault(SettingKeys.OpeningHours) is { Length: > 0 } json)
        {
            try { days = JsonSerializer.Deserialize<List<OpeningDayDto>>(json, JsonSerializerOptions.Web); }
            catch (JsonException) { /* unreadable: fall back to the defaults */ }
        }
        return new BookingHoursDto(minutes, days is { Count: 7 } ? days : DefaultDays);
    }

    public async Task<BookingHoursDto> SaveAsync(BookingHoursDto request, int? userId, CancellationToken ct)
    {
        if (request.BotBookingMinutes is < 10 or > 240 || request.BotBookingMinutes % 5 != 0)
            throw new BusinessRuleException("Booking length must be 10–240 minutes, in steps of 5.", field: "botBookingMinutes");

        var days = new List<OpeningDayDto>();
        foreach (var day in Week)
        {
            var name = Name(day);
            var sent = request.Days.FirstOrDefault(d => string.Equals(d.Day, name, StringComparison.OrdinalIgnoreCase))
                ?? throw new BusinessRuleException($"Opening hours are missing for {Title(name)}.", field: "days");
            if (!sent.IsOpen)
            {
                days.Add(new OpeningDayDto(name, false, null, null));
                continue;
            }
            if (ParseTime(sent.From) is not { } from || ParseTime(sent.To) is not { } to)
                throw new BusinessRuleException($"Enter opening and closing times for {Title(name)}.", field: $"days.{name}");
            if (to <= from)
                throw new BusinessRuleException($"{Title(name)} must close after it opens.", field: $"days.{name}");
            if ((to - from).TotalMinutes < request.BotBookingMinutes)
                throw new BusinessRuleException($"{Title(name)} is open for less than one {request.BotBookingMinutes}-minute booking.", field: $"days.{name}");
            days.Add(new OpeningDayDto(name, true, from.ToString("HH:mm", CultureInfo.InvariantCulture), to.ToString("HH:mm", CultureInfo.InvariantCulture)));
        }

        var values = new Dictionary<string, string>
        {
            [SettingKeys.OpeningHours] = JsonSerializer.Serialize(days, JsonSerializerOptions.Web),
            [SettingKeys.BotBookingMinutes] = request.BotBookingMinutes.ToString(CultureInfo.InvariantCulture),
        };
        var existing = await db.SystemSettings.Where(s => values.Keys.Contains(s.Key)).ToDictionaryAsync(s => s.Key, ct);
        var changed = false;
        foreach (var (key, value) in values)
        {
            if (existing.TryGetValue(key, out var row))
            {
                if (row.Value == value) continue;
                row.Value = value;
                row.UpdatedAt = DateTime.UtcNow;
            }
            else db.SystemSettings.Add(new SystemSetting { Key = key, Value = value, UpdatedAt = DateTime.UtcNow });
            changed = true;
        }
        if (changed)
        {
            audit.Record(userId, "Settings Updated", nameof(SystemSetting), null, new { changed = values.Keys });
            await db.SaveChangesAsync(ct);
        }
        return await GetAsync(ct);
    }

    /// <summary>When the clinic is open on <paramref name="date"/>, or null if it is closed.</summary>
    public static (TimeOnly From, TimeOnly To)? OpenOn(BookingHoursDto hours, DateOnly date)
    {
        var day = hours.Days.FirstOrDefault(d => d.Day == Name(date.DayOfWeek));
        return day is { IsOpen: true } && ParseTime(day.From) is { } from && ParseTime(day.To) is { } to && to > from ? (from, to) : null;
    }

    public static TimeOnly? ParseTime(string? value) =>
        TimeOnly.TryParseExact(value?.Trim(), ["HH:mm", "H:mm", "HH:mm:ss"], CultureInfo.InvariantCulture, DateTimeStyles.None, out var t) ? t : null;

    private static string Name(DayOfWeek day) => day.ToString().ToLowerInvariant();

    private static string Title(string name) => char.ToUpperInvariant(name[0]) + name[1..];
}
