using System.Globalization;
using System.Text.Json;
using DoctorCrm.Api.Entities;

namespace DoctorCrm.Api.Services;

/// <summary>
/// Converts custom field values between the API's typed JSON and the stored text, validating
/// them against the field's type. One place owns the storage format.
/// </summary>
public static class CustomFieldValueConverter
{
    /// <summary>
    /// Validates <paramref name="value"/> for <paramref name="field"/> and returns the text to store,
    /// or null when the value is empty. Throws a field-level <see cref="BusinessRuleException"/>.
    /// </summary>
    public static string? ToStorage(CustomField field, JsonElement value)
    {
        if (value.ValueKind is JsonValueKind.Null or JsonValueKind.Undefined) return null;
        if (value.ValueKind == JsonValueKind.String && string.IsNullOrWhiteSpace(value.GetString())) return null;

        string Fail(string message) => throw new BusinessRuleException(message, field: $"customFields.{field.Key}");

        switch (field.FieldType)
        {
            case CustomFieldType.Text:
            case CustomFieldType.Textarea:
            case CustomFieldType.Phone:
            {
                if (value.ValueKind != JsonValueKind.String) return Fail($"{field.Label} must be text.");
                var text = value.GetString()!.Trim();
                var max = field.FieldType == CustomFieldType.Textarea ? 4000 : 500;
                return text.Length > max ? Fail($"{field.Label} is too long.") : text;
            }
            case CustomFieldType.Email:
            {
                var text = value.ValueKind == JsonValueKind.String ? value.GetString()!.Trim() : "";
                return System.Net.Mail.MailAddress.TryCreate(text, out _) && text.Length <= 254
                    ? text.ToLowerInvariant()
                    : Fail($"{field.Label} must be a valid email address.");
            }
            case CustomFieldType.Number:
            {
                decimal number;
                var ok = value.ValueKind == JsonValueKind.Number
                    ? value.TryGetDecimal(out number)
                    : decimal.TryParse(value.ValueKind == JsonValueKind.String ? value.GetString() : null,
                        NumberStyles.Number, CultureInfo.InvariantCulture, out number);
                return ok ? number.ToString(CultureInfo.InvariantCulture) : Fail($"{field.Label} must be a number.");
            }
            case CustomFieldType.Date:
            {
                var text = value.ValueKind == JsonValueKind.String ? value.GetString() : null;
                return DateOnly.TryParseExact(text, "yyyy-MM-dd", CultureInfo.InvariantCulture, DateTimeStyles.None, out var date)
                    ? date.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture)
                    : Fail($"{field.Label} must be a date.");
            }
            case CustomFieldType.Boolean:
                return value.ValueKind switch
                {
                    JsonValueKind.True => "true",
                    JsonValueKind.False => "false",
                    _ => Fail($"{field.Label} must be yes or no."),
                };
            case CustomFieldType.Dropdown:
            {
                if (value.ValueKind != JsonValueKind.Number || !value.TryGetInt32(out var id)) return Fail($"Choose an option for {field.Label}.");
                return field.Options.Any(o => o.Id == id) ? id.ToString(CultureInfo.InvariantCulture) : Fail($"Choose a valid option for {field.Label}.");
            }
            case CustomFieldType.MultiSelect:
            {
                if (value.ValueKind != JsonValueKind.Array) return Fail($"Choose options for {field.Label}.");
                var ids = new List<int>();
                foreach (var item in value.EnumerateArray())
                {
                    if (item.ValueKind != JsonValueKind.Number || !item.TryGetInt32(out var id) || field.Options.All(o => o.Id != id))
                        return Fail($"Choose valid options for {field.Label}.");
                    if (!ids.Contains(id)) ids.Add(id);
                }
                return ids.Count == 0 ? null : JsonSerializer.Serialize(ids);
            }
            default:
                return Fail($"{field.Label} has an unknown type.");
        }
    }

    /// <summary>Stored text → typed JSON value plus a human-readable display string.</summary>
    public static (JsonElement Value, string Display) FromStorage(CustomField field, string stored)
    {
        string OptionLabel(int id) => field.Options.FirstOrDefault(o => o.Id == id)?.Label ?? "(removed option)";

        switch (field.FieldType)
        {
            case CustomFieldType.Number:
                return decimal.TryParse(stored, NumberStyles.Number, CultureInfo.InvariantCulture, out var n)
                    ? (JsonSerializer.SerializeToElement(n), n.ToString("G", CultureInfo.InvariantCulture))
                    : (JsonSerializer.SerializeToElement(stored), stored);
            case CustomFieldType.Boolean:
                var b = stored == "true";
                return (JsonSerializer.SerializeToElement(b), b ? "Yes" : "No");
            case CustomFieldType.Date:
                return (JsonSerializer.SerializeToElement(stored),
                    DateOnly.TryParseExact(stored, "yyyy-MM-dd", out var d) ? d.ToString("d MMM yyyy", CultureInfo.InvariantCulture) : stored);
            case CustomFieldType.Dropdown:
                return int.TryParse(stored, out var id)
                    ? (JsonSerializer.SerializeToElement(id), OptionLabel(id))
                    : (JsonSerializer.SerializeToElement(stored), stored);
            case CustomFieldType.MultiSelect:
                var ids = JsonSerializer.Deserialize<int[]>(stored) ?? [];
                return (JsonSerializer.SerializeToElement(ids), string.Join(", ", ids.Select(OptionLabel)));
            default:
                return (JsonSerializer.SerializeToElement(stored), stored);
        }
    }
}
