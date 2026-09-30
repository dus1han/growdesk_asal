namespace DoctorCrm.Api.Entities;

public class Stage : AuditableEntity
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;

    /// <summary>
    /// Fixed key used by stage automation (e.g. "interested", "booked"). Admins can rename
    /// <see cref="Name"/> freely; automation always looks stages up by this key. Null for
    /// stages added by admins, which automation never targets.
    /// </summary>
    public string? SystemKey { get; set; }

    /// <summary>Hex colour, e.g. "#6366F1".</summary>
    public string Color { get; set; } = "#64748B";

    public int DisplayOrder { get; set; }
    public bool IsActive { get; set; } = true;
}

public static class StageKeys
{
    public const string Interested = "interested";
    public const string FollowUp = "follow_up";
    public const string Booked = "booked";
    public const string ConsultationCompleted = "consultation_completed";
    public const string TreatmentStarted = "treatment_started";
    public const string Completed = "completed";
    public const string Lost = "lost";
}
