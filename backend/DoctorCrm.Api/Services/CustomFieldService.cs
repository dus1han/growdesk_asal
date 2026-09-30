using System.Text;
using System.Text.RegularExpressions;
using DoctorCrm.Api.Data;
using DoctorCrm.Api.DTOs;
using DoctorCrm.Api.Entities;
using Microsoft.EntityFrameworkCore;

namespace DoctorCrm.Api.Services;

/// <summary>
/// Admin-defined customer fields (spec §32). A new field also gets a capture-tool row, switched
/// off, so admins decide separately whether the capture tool asks for it.
/// </summary>
public partial class CustomFieldService(AppDbContext db, AuditService audit)
{
    [GeneratedRegex("[^a-z0-9]+")]
    private static partial Regex NonSlug();

    public async Task<IReadOnlyList<CustomFieldDto>> ListAsync(bool includeInactive, CancellationToken ct)
    {
        var fields = await db.CustomFields.AsNoTracking()
            .Include(f => f.Options)
            .Where(f => includeInactive || f.IsActive)
            .OrderBy(f => f.DisplayOrder).ThenBy(f => f.Label)
            .ToListAsync(ct);
        return fields.Select(ToDto).ToList();
    }

    public async Task<CustomFieldDto> CreateAsync(SaveCustomFieldRequest request, int? userId, CancellationToken ct)
    {
        var label = request.Label.Trim();
        await EnsureLabelIsFreeAsync(label, null, ct);
        var type = Enum.Parse<CustomFieldType>(request.FieldType, ignoreCase: true);

        var maxOrder = await db.CustomFields.MaxAsync(f => (int?)f.DisplayOrder, ct) ?? 0;
        var field = new CustomField
        {
            Key = await UniqueKeyAsync(label, ct),
            Label = label,
            FieldType = type,
            IsRequired = request.IsRequired,
            DisplayOrder = maxOrder + 1,
        };
        if (field.HasOptions) SyncOptions(field, request.Options!);

        db.CustomFields.Add(field);

        var maxCaptureOrder = await db.CaptureFieldConfigurations.MaxAsync(c => (int?)c.DisplayOrder, ct) ?? 0;
        db.CaptureFieldConfigurations.Add(new CaptureFieldConfiguration
        {
            FieldKey = field.Key,
            CustomField = field,
            IsEnabled = false,
            IsRequired = false,
            DisplayOrder = maxCaptureOrder + 1,
            UpdatedAt = DateTime.UtcNow,
        });

        await db.SaveChangesAsync(ct);
        audit.Record(userId, "Custom Field Created", nameof(CustomField), field.Id, new { field.Key, field.Label, type = type.ToString() });
        await db.SaveChangesAsync(ct);
        return ToDto(field);
    }

    public async Task<CustomFieldDto> UpdateAsync(int id, SaveCustomFieldRequest request, int? userId, CancellationToken ct)
    {
        var field = await FindAsync(id, ct);
        var type = Enum.Parse<CustomFieldType>(request.FieldType, ignoreCase: true);
        if (type != field.FieldType)
            throw new BusinessRuleException("A field's type can't be changed once created. Create a new field instead.",
                field: "fieldType");

        var label = request.Label.Trim();
        await EnsureLabelIsFreeAsync(label, id, ct);

        field.Label = label;
        field.IsRequired = request.IsRequired;
        if (field.HasOptions) SyncOptions(field, request.Options!);

        audit.Record(userId, "Custom Field Updated", nameof(CustomField), id, new { field.Key, field.Label });
        await db.SaveChangesAsync(ct);
        return ToDto(field);
    }

    public async Task<CustomFieldDto> SetActiveAsync(int id, bool isActive, int? userId, CancellationToken ct)
    {
        var field = await FindAsync(id, ct);
        if (field.IsActive != isActive)
        {
            field.IsActive = isActive;

            // An inactive field can't be collected by the capture tool either.
            if (!isActive)
            {
                var capture = await db.CaptureFieldConfigurations.SingleOrDefaultAsync(c => c.CustomFieldId == id, ct);
                if (capture is not null)
                {
                    capture.IsEnabled = false;
                    capture.IsRequired = false;
                    capture.UpdatedAt = DateTime.UtcNow;
                }
            }

            audit.Record(userId, isActive ? "Custom Field Activated" : "Custom Field Deactivated", nameof(CustomField), id, new { field.Key });
            await db.SaveChangesAsync(ct);
        }
        return ToDto(field);
    }

    public async Task<IReadOnlyList<CustomFieldDto>> ReorderAsync(IReadOnlyList<int> ids, int? userId, CancellationToken ct)
    {
        var fields = await db.CustomFields.Include(f => f.Options).ToListAsync(ct);
        if (fields.Count != ids.Count || fields.Any(f => !ids.Contains(f.Id)))
            throw new BusinessRuleException("The list changed while you were reordering it. Please refresh and try again.",
                StatusCodes.Status409Conflict);

        for (var i = 0; i < ids.Count; i++) fields.Single(f => f.Id == ids[i]).DisplayOrder = i + 1;
        audit.Record(userId, "Custom Field Reordered", nameof(CustomField), null, new { ids });
        await db.SaveChangesAsync(ct);
        return fields.OrderBy(f => f.DisplayOrder).Select(ToDto).ToList();
    }

    /// <summary>
    /// Makes the field's active options match the request, in order. Existing options keep their
    /// id (renames apply in place); options left out are deactivated rather than deleted.
    /// </summary>
    private static void SyncOptions(CustomField field, IReadOnlyList<SaveCustomFieldOption> requested)
    {
        var keptIds = requested.Where(o => o.Id is not null).Select(o => o.Id!.Value).ToHashSet();
        foreach (var existing in field.Options.Where(o => !keptIds.Contains(o.Id)))
            existing.IsActive = false;

        for (var i = 0; i < requested.Count; i++)
        {
            var r = requested[i];
            var option = r.Id is null ? null : field.Options.SingleOrDefault(o => o.Id == r.Id);
            if (option is null)
            {
                option = new CustomFieldOption();
                field.Options.Add(option);
            }
            option.Label = r.Label.Trim();
            option.DisplayOrder = i + 1;
            option.IsActive = true;
        }
    }

    private async Task<string> UniqueKeyAsync(string label, CancellationToken ct)
    {
        var baseKey = Slug(label);
        var key = baseKey;
        var builtIns = CaptureFields.BuiltIns.Select(b => b.Key).ToHashSet();
        for (var n = 2; builtIns.Contains(key) || await db.CustomFields.AnyAsync(f => f.Key == key, ct); n++)
            key = $"{baseKey}_{n}";
        return key;
    }

    private static string Slug(string label)
    {
        var ascii = new string(label.Normalize(NormalizationForm.FormD)
            .Where(c => System.Globalization.CharUnicodeInfo.GetUnicodeCategory(c) != System.Globalization.UnicodeCategory.NonSpacingMark)
            .ToArray());
        var slug = NonSlug().Replace(ascii.ToLowerInvariant(), "_").Trim('_');
        if (slug.Length == 0) slug = "field";
        return slug.Length > 50 ? slug[..50].TrimEnd('_') : slug;
    }

    private async Task EnsureLabelIsFreeAsync(string label, int? excludeId, CancellationToken ct)
    {
        var lower = label.ToLower();
        if (await db.CustomFields.AnyAsync(f => f.Label.ToLower() == lower && f.Id != excludeId, ct))
            throw BusinessRuleException.Conflict($"A field named \"{label}\" already exists.", "label");
    }

    private async Task<CustomField> FindAsync(int id, CancellationToken ct) =>
        await db.CustomFields.Include(f => f.Options).SingleOrDefaultAsync(f => f.Id == id, ct)
        ?? throw BusinessRuleException.NotFound("Custom field");

    private static CustomFieldDto ToDto(CustomField f) => new(
        f.Id,
        f.Key,
        f.Label,
        f.FieldType.ToString(),
        f.IsRequired,
        f.IsActive,
        f.DisplayOrder,
        f.Options.Where(o => o.IsActive).OrderBy(o => o.DisplayOrder)
            .Select(o => new CustomFieldOptionDto(o.Id, o.Label, o.DisplayOrder, o.IsActive)).ToList());
}
