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
    public record BuiltIn(string Key, string Label, string Type, bool Locked, bool DefaultEnabled, bool DefaultRequired);

    public const string Name = "name";
    public const string WhatsApp = "whatsapp";

    /// <summary>
    /// Name and WhatsApp are locked on and required: WhatsApp is how duplicate customers are
    /// detected (spec §35), and a customer without a name cannot be worked with.
    /// </summary>
    public static readonly IReadOnlyList<BuiltIn> BuiltIns =
    [
        new(Name, "Name", "text", Locked: true, DefaultEnabled: true, DefaultRequired: true),
        new(WhatsApp, "WhatsApp Number", "phone", Locked: true, DefaultEnabled: true, DefaultRequired: true),
        new("secondary_phone", "Secondary Number", "phone", false, true, false),
        new("instagram", "Instagram", "text", false, true, false),
        new("treatments", "Interested Treatments", "multiselect", false, true, false),
        new("stage", "Stage", "dropdown", false, true, false),
        new("lead_source", "Lead Source", "dropdown", false, false, false),
        new("notes", "Notes", "textarea", false, false, false),
        new("email", "Email", "email", false, false, false),
    ];

    public static BuiltIn? Find(string key) => BuiltIns.FirstOrDefault(b => b.Key == key);
}
