namespace DoctorCrm.Api.Entities;

/// <summary>
/// An admin-managed list item: treatments, stages, lead sources, cancellation reasons and
/// payment methods. Items are deactivated, never deleted, so historical records keep them.
/// </summary>
public interface ILookupEntity
{
    int Id { get; set; }
    string Name { get; set; }
    bool IsActive { get; set; }
    int DisplayOrder { get; set; }
}

public interface IHasDescription
{
    string? Description { get; set; }
}

public interface IHasColor
{
    string Color { get; set; }
}

public class LeadSource : AuditableEntity, ILookupEntity
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public bool IsActive { get; set; } = true;
    public int DisplayOrder { get; set; }
}

public class CancellationReason : AuditableEntity, ILookupEntity
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public bool IsActive { get; set; } = true;
    public int DisplayOrder { get; set; }
}

public class PaymentMethod : AuditableEntity, ILookupEntity
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public bool IsActive { get; set; } = true;
    public int DisplayOrder { get; set; }
}
