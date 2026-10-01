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

    /// <summary>Weekly opening hours (JSON), used for the WhatsApp BOT's free times and bookings.</summary>
    public const string OpeningHours = "booking.opening_hours";

    /// <summary>Length in minutes of a consultation booked by the WhatsApp BOT.</summary>
    public const string BotBookingMinutes = "booking.bot_minutes";
}
