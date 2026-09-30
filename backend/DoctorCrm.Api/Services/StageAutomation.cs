using DoctorCrm.Api.Data;
using DoctorCrm.Api.Entities;
using Microsoft.EntityFrameworkCore;

namespace DoctorCrm.Api.Services;

/// <summary>
/// The CRM owns stage automation (spec §18). Stages are found by their fixed system key, so
/// admins can rename them without breaking this.
/// </summary>
public class StageAutomation(AppDbContext db, AuditService audit)
{
    /// <summary>
    /// Moves the customer to <paramref name="toKey"/> if they are currently in one of
    /// <paramref name="fromKeys"/>. Customers further along (or manually placed elsewhere) are left alone.
    /// The change is added to the current unit of work; the caller saves.
    /// </summary>
    public async Task MoveAsync(Customer customer, string[] fromKeys, string toKey, int? userId, string reason, CancellationToken ct)
    {
        var current = await db.Stages.AsNoTracking().SingleAsync(s => s.Id == customer.StageId, ct);
        if (current.SystemKey is null || !fromKeys.Contains(current.SystemKey)) return;

        var target = await db.Stages.AsNoTracking().SingleAsync(s => s.SystemKey == toKey, ct);
        customer.StageId = target.Id;
        audit.Record(userId, "Stage Changed", nameof(Customer), customer.Id,
            new { from = current.Name, to = target.Name, automatic = true, reason });
    }
}
