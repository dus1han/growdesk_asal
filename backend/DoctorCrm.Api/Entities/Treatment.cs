namespace DoctorCrm.Api.Entities;

public class Treatment : AuditableEntity, ILookupEntity, IHasDescription
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public bool IsActive { get; set; } = true;
    public int DisplayOrder { get; set; }
}
