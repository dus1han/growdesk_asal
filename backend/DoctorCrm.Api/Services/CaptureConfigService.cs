using DoctorCrm.Api.Data;
using DoctorCrm.Api.DTOs;
using DoctorCrm.Api.Entities;
using Microsoft.EntityFrameworkCore;

namespace DoctorCrm.Api.Services;

/// <summary>
/// Which fields the WhatsApp capture tool shows, required or not, and in what order (spec §31).
/// The capture API (Milestone 7) reads the same rows.
/// </summary>
public class CaptureConfigService(AppDbContext db, AuditService audit)
{
    public async Task<IReadOnlyList<CaptureFieldDto>> ListAsync(CancellationToken ct)
    {
        var rows = await db.CaptureFieldConfigurations.AsNoTracking()
            .Include(c => c.CustomField)
            .OrderBy(c => c.DisplayOrder)
            .ToListAsync(ct);

        return rows
            // Inactive custom fields can't be captured, so they aren't offered.
            .Where(r => r.CustomField is null || r.CustomField.IsActive)
            .Select(ToDto)
            .Where(d => d is not null)
            .Select(d => d!)
            .ToList();
    }

    public async Task<IReadOnlyList<CaptureFieldDto>> SaveAsync(IReadOnlyList<SaveCaptureField> fields, int? userId, CancellationToken ct)
    {
        var rows = await db.CaptureFieldConfigurations.Include(c => c.CustomField).ToListAsync(ct);
        var editable = rows.Where(r => r.CustomField is null || r.CustomField.IsActive).ToList();

        if (editable.Count != fields.Count || editable.Any(r => fields.All(f => f.Key != r.FieldKey)))
            throw new BusinessRuleException("The field list changed while you were editing it. Please refresh and try again.",
                StatusCodes.Status409Conflict);

        // STOP needs a condition: without a required field the toolbar could save an empty lead.
        if (!fields.Any(f => f.IsEnabled && f.IsRequired))
            throw new BusinessRuleException("Mark at least one field as required, so every captured lead can be identified.");

        var now = DateTime.UtcNow;
        for (var i = 0; i < fields.Count; i++)
        {
            var f = fields[i];
            var row = editable.Single(r => r.FieldKey == f.Key);
            row.IsEnabled = f.IsEnabled;
            row.IsRequired = f.IsEnabled && f.IsRequired; // a hidden field can't be required
            row.DisplayOrder = i + 1;
            row.UpdatedAt = now;
        }

        // Inactive custom fields sort after everything else.
        var next = fields.Count;
        foreach (var row in rows.Except(editable).OrderBy(r => r.DisplayOrder)) row.DisplayOrder = ++next;

        audit.Record(userId, "Capture Configuration Updated", nameof(CaptureFieldConfiguration), null,
            new { enabled = fields.Where(f => f.IsEnabled).Select(f => f.Key) });
        await db.SaveChangesAsync(ct);
        return await ListAsync(ct);
    }

    private static CaptureFieldDto? ToDto(CaptureFieldConfiguration row)
    {
        if (row.CustomField is { } cf)
            return new CaptureFieldDto(row.FieldKey, cf.Label, cf.FieldType.ToString().ToLowerInvariant(), IsCustom: true,
                row.IsEnabled, row.IsRequired, row.DisplayOrder);

        var builtIn = CaptureFields.Find(row.FieldKey);
        return builtIn is null
            ? null
            : new CaptureFieldDto(row.FieldKey, builtIn.Label, builtIn.Type, IsCustom: false,
                row.IsEnabled, row.IsRequired, row.DisplayOrder);
    }
}
