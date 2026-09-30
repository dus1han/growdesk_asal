namespace DoctorCrm.Api.Entities;

public class AuditLog
{
    public long Id { get; set; }
    public int? UserId { get; set; }
    public User? User { get; set; }
    public string Action { get; set; } = string.Empty;
    public string EntityType { get; set; } = string.Empty;
    public string? EntityId { get; set; }

    /// <summary>JSON document with action-specific details.</summary>
    public string? Metadata { get; set; }

    public DateTime CreatedAt { get; set; }
}

public static class AuditActions
{
    public const string UserLoggedIn = "User Logged In";
    public const string UserLoginFailed = "User Login Failed";
    public const string UserLoggedOut = "User Logged Out";
    public const string PasswordChanged = "Password Changed";
}
