namespace DoctorCrm.Api.Entities;

/// <summary>
/// Which fields the external WhatsApp capture tool shows, whether each is required, and in what
/// order (spec §31). One row per built-in field plus one per custom field.
/// </summary>
public class CaptureFieldConfiguration
{
    public int Id { get; set; }

    /// <summary>A <see cref="CaptureFields"/> key for built-ins, or the custom field's key.</summary>
    public string FieldKey { get; set; } = string.Empty;

    public int? CustomFieldId { get; set; }
    public CustomField? CustomField { get; set; }

    public bool IsEnabled { get; set; }
    public bool IsRequired { get; set; }
    public int DisplayOrder { get; set; }
    public DateTime UpdatedAt { get; set; }
}

/// <summary>The built-in customer fields the capture tool can collect.</summary>
public static class CaptureFields
{
    public record BuiltIn(string Key, string Label, string Type, bool DefaultEnabled, bool DefaultRequired);

    public const string Name = "name";
    public const string WhatsApp = "whatsapp";

    /// <summary>
    /// Every field, including Name and WhatsApp, is configurable: the admin decides what the
    /// CRM Capture toolbar must collect before STOP can save (decided 2026-09-30).
    /// </summary>
    public static readonly IReadOnlyList<BuiltIn> BuiltIns =
    [
        new(Name, "Name", "text", DefaultEnabled: true, DefaultRequired: true),
        new(WhatsApp, "WhatsApp Number", "phone", DefaultEnabled: true, DefaultRequired: true),
        new("secondary_phone", "Secondary Number", "phone", true, false),
        new("instagram", "Instagram", "text", true, false),
        new("treatments", "Interested Treatments", "multiselect", true, false),
        new("stage", "Status", "dropdown", true, false),
        new("lead_source", "Lead Source", "dropdown", false, false),
        new("notes", "Notes", "textarea", false, false),
        new("email", "Email", "email", false, false),
    ];

    public static BuiltIn? Find(string key) => BuiltIns.FirstOrDefault(b => b.Key == key);
}
