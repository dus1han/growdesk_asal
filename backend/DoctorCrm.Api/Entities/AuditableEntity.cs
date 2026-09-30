namespace DoctorCrm.Api.Entities;

/// <summary>Base for entities that track creation and update times. Timestamps are set by AppDbContext.</summary>
public abstract class AuditableEntity
{
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}
