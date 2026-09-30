using System.Text.Json;
using DoctorCrm.Api.Data;
using DoctorCrm.Api.Entities;

namespace DoctorCrm.Api.Services;

/// <summary>
/// Adds audit entries to the current unit of work. The caller's SaveChangesAsync commits the
/// entry together with the change it describes, so an audit row never exists without its change.
/// </summary>
public class AuditService(AppDbContext db)
{
    public void Record(int? userId, string action, string entityType, object? entityId = null, object? metadata = null)
    {
        db.AuditLogs.Add(new AuditLog
        {
            UserId = userId,
            Action = action,
            EntityType = entityType,
            EntityId = entityId?.ToString(),
            Metadata = metadata is null ? null : JsonSerializer.Serialize(metadata),
            CreatedAt = DateTime.UtcNow,
        });
    }
}
