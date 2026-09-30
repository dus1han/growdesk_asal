namespace DoctorCrm.Api.Entities;

/// <summary>Key/value system configuration (branding, currency, timezone).</summary>
public class SystemSetting
{
    public string Key { get; set; } = string.Empty;
    public string Value { get; set; } = string.Empty;
    public DateTime UpdatedAt { get; set; }
}

public static class SettingKeys
{
    public const string CrmName = "branding.crm_name";
    public const string Tagline = "branding.tagline";
    public const string LogoUrl = "branding.logo_url";
    public const string Currency = "locale.currency";
    public const string TimeZone = "locale.time_zone";
}
