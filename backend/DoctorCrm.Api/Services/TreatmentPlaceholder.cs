using DoctorCrm.Api.Data;
using DoctorCrm.Api.Entities;
using Microsoft.EntityFrameworkCore;

namespace DoctorCrm.Api.Services;

/// <summary>
/// A treatment named "-" stands for "not decided yet", e.g. when the WhatsApp BOT saves a new
/// contact before they say what they want. It only stays while nothing else is chosen: as soon as
/// a customer or booking has a real treatment, the placeholder is dropped.
/// </summary>
public static class TreatmentPlaceholder
{
    private static readonly string[] Names = ["-", "–", "—"];

    public static bool IsPlaceholder(string name) => Names.Contains(name.Trim());

    /// <summary>IDs of the placeholder treatment(s); usually one, often none.</summary>
    public static async Task<HashSet<int>> IdsAsync(AppDbContext db, CancellationToken ct) =>
        (await db.Treatments.AsNoTracking().Select(t => new { t.Id, t.Name }).ToListAsync(ct))
        .Where(t => IsPlaceholder(t.Name)).Select(t => t.Id).ToHashSet();

    /// <summary>The chosen treatments without the placeholder, unless it is all there is.</summary>
    public static List<int> Strip(IEnumerable<int> ids, IReadOnlySet<int> placeholders)
    {
        var list = ids.Distinct().ToList();
        return list.Any(id => !placeholders.Contains(id)) ? list.Where(id => !placeholders.Contains(id)).ToList() : list;
    }

    /// <summary>Removes the placeholder from a customer's interests once they have a real treatment.</summary>
    public static void Tidy(Customer customer, IReadOnlySet<int> placeholders)
    {
        if (placeholders.Count == 0 || !customer.Treatments.Any(t => !placeholders.Contains(t.TreatmentId))) return;
        foreach (var row in customer.Treatments.Where(t => placeholders.Contains(t.TreatmentId)).ToList())
            customer.Treatments.Remove(row);
    }
}
