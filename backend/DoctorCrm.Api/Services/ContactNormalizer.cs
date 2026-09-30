using System.Text.RegularExpressions;
using PhoneNumbers;

namespace DoctorCrm.Api.Services;

/// <summary>
/// Puts phone numbers and Instagram handles into one canonical form, so "050 123 4567",
/// "+971501234567" and "00971 50 123 4567" are recognised as the same customer. Used by both
/// the CRM forms and (Milestone 7) the capture API.
/// </summary>
public partial class ContactNormalizer(IConfiguration config)
{
    private static readonly PhoneNumberUtil Phones = PhoneNumberUtil.GetInstance();

    /// <summary>Region assumed for numbers typed without a country code. Phone:DefaultRegion, default AE.</summary>
    private readonly string _defaultRegion = config["Phone:DefaultRegion"] ?? "AE";

    [GeneratedRegex(@"^[a-z0-9._]{1,30}$")]
    private static partial Regex InstagramHandle();

    /// <summary>E.164, or null when the text is not a valid phone number.</summary>
    public string? NormalizePhone(string? input)
    {
        if (string.IsNullOrWhiteSpace(input)) return null;
        var text = input.Trim();
        if (text.StartsWith("00")) text = "+" + text[2..];
        try
        {
            var number = Phones.Parse(text, _defaultRegion);
            return Phones.IsValidNumber(number) ? Phones.Format(number, PhoneNumberFormat.E164) : null;
        }
        catch (NumberParseException)
        {
            return null;
        }
    }

    /// <summary>"+971501234567" → "+971 50 123 4567". Falls back to the stored text.</summary>
    public static string FormatPhone(string? e164)
    {
        if (string.IsNullOrEmpty(e164)) return "";
        try
        {
            return Phones.Format(Phones.Parse(e164, null), PhoneNumberFormat.INTERNATIONAL);
        }
        catch (NumberParseException)
        {
            return e164;
        }
    }

    /// <summary>"@Sarah.F", "instagram.com/sarah.f/" → "sarah.f". Null when not a valid handle.</summary>
    public static string? NormalizeInstagram(string? input)
    {
        if (string.IsNullOrWhiteSpace(input)) return null;
        var text = input.Trim().ToLowerInvariant();

        var marker = text.IndexOf("instagram.com/", StringComparison.Ordinal);
        if (marker >= 0) text = text[(marker + "instagram.com/".Length)..];
        text = text.Split('?', '#')[0].Trim('/').TrimStart('@');

        return InstagramHandle().IsMatch(text) ? text : null;
    }
}
