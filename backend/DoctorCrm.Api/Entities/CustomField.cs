namespace DoctorCrm.Api.Entities;

public enum CustomFieldType
{
    Text,
    Textarea,
    Number,
    Phone,
    Email,
    Date,
    Dropdown,
    MultiSelect,
    Boolean,
}

/// <summary>An admin-defined customer field (spec §32). Values are stored per customer.</summary>
public class CustomField : AuditableEntity
{
    public int Id { get; set; }

    /// <summary>
    /// Stable machine key (e.g. "preferred_branch"), generated from the first label and never
    /// changed afterwards: stored values and the capture tool refer to it.
    /// </summary>
    public string Key { get; set; } = string.Empty;

    public string Label { get; set; } = string.Empty;

    /// <summary>Fixed after creation, so existing values can never become unreadable.</summary>
    public CustomFieldType FieldType { get; set; }

    public bool IsRequired { get; set; }
    public bool IsActive { get; set; } = true;
    public int DisplayOrder { get; set; }

    public ICollection<CustomFieldOption> Options { get; set; } = new List<CustomFieldOption>();

    public bool HasOptions => FieldType is CustomFieldType.Dropdown or CustomFieldType.MultiSelect;
}

public class CustomFieldOption
{
    public int Id { get; set; }
    public int CustomFieldId { get; set; }
    public CustomField CustomField { get; set; } = null!;
    public string Label { get; set; } = string.Empty;
    public int DisplayOrder { get; set; }

    /// <summary>Removed options are deactivated so customers who chose them keep their value.</summary>
    public bool IsActive { get; set; } = true;
}
