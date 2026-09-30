using DoctorCrm.Api.Data;
using DoctorCrm.Api.DTOs;
using DoctorCrm.Api.Entities;
using Microsoft.EntityFrameworkCore;

namespace DoctorCrm.Api.Services;

public class SettingsService(AppDbContext db, AuditService audit)
{
    private static readonly string[] Keys =
        [SettingKeys.CrmName, SettingKeys.Tagline, SettingKeys.LogoUrl, SettingKeys.Currency, SettingKeys.TimeZone];

    public async Task<SystemSettingsDto> GetAsync(CancellationToken ct)
    {
        var v = await db.SystemSettings.AsNoTracking().Where(s => Keys.Contains(s.Key)).ToDictionaryAsync(s => s.Key, s => s.Value, ct);
        var logo = v.GetValueOrDefault(SettingKeys.LogoUrl);
        return new SystemSettingsDto(
            v.GetValueOrDefault(SettingKeys.CrmName) ?? "GrowDesk",
            v.GetValueOrDefault(SettingKeys.Tagline) ?? "",
            string.IsNullOrWhiteSpace(logo) ? null : logo,
            v.GetValueOrDefault(SettingKeys.Currency) ?? "AED",
            v.GetValueOrDefault(SettingKeys.TimeZone) ?? "Asia/Dubai");
    }

    public async Task<SystemSettingsDto> SaveAsync(SystemSettingsDto request, int? userId, CancellationToken ct)
    {
        var values = new Dictionary<string, string>
        {
            [SettingKeys.CrmName] = request.CrmName.Trim(),
            [SettingKeys.Tagline] = request.Tagline?.Trim() ?? "",
            [SettingKeys.LogoUrl] = request.LogoUrl?.Trim() ?? "",
            [SettingKeys.Currency] = request.Currency.Trim().ToUpperInvariant(),
            [SettingKeys.TimeZone] = request.TimeZone.Trim(),
        };

        var existing = await db.SystemSettings.Where(s => Keys.Contains(s.Key)).ToDictionaryAsync(s => s.Key, ct);
        var now = DateTime.UtcNow;
        var changed = new List<string>();
        foreach (var (key, value) in values)
        {
            if (existing.TryGetValue(key, out var row))
            {
                if (row.Value == value) continue;
                row.Value = value;
                row.UpdatedAt = now;
            }
            else
            {
                db.SystemSettings.Add(new SystemSetting { Key = key, Value = value, UpdatedAt = now });
            }
            changed.Add(key);
        }

        if (changed.Count > 0)
        {
            audit.Record(userId, "Settings Updated", nameof(SystemSetting), null, new { changed });
            await db.SaveChangesAsync(ct);
        }
        return await GetAsync(ct);
    }
}
