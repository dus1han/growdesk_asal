namespace DoctorCrm.Api.Entities;

public class User : AuditableEntity
{
    public int Id { get; set; }
    public string FullName { get; set; } = string.Empty;

    /// <summary>Always stored lower-cased and trimmed.</summary>
    public string Email { get; set; } = string.Empty;

    public string PasswordHash { get; set; } = string.Empty;
    public bool IsActive { get; set; } = true;
    public DateTime? LastLoginAt { get; set; }

    public ICollection<UserRole> UserRoles { get; set; } = new List<UserRole>();
}
