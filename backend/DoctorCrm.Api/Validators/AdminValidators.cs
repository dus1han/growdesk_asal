using System.Text.RegularExpressions;
using DoctorCrm.Api.DTOs;
using DoctorCrm.Api.Entities;
using FluentValidation;

namespace DoctorCrm.Api.Validators;

public static partial class Rules
{
    [GeneratedRegex("^[A-Za-z0-9._-]{3,50}$")]
    public static partial Regex Username();

    [GeneratedRegex("^#[0-9A-Fa-f]{6}$")]
    public static partial Regex HexColor();

    [GeneratedRegex("^[A-Z]{3}$")]
    public static partial Regex CurrencyCode();

    public const string UsernameMessage = "Use 3–50 letters, numbers, dots, dashes or underscores (no spaces).";
    public const string PasswordMessage = "Use at least 8 characters, including a letter and a number.";

    /// <summary>ISO 4217 codes of every region .NET knows. Falls back to the format check if ICU is unavailable.</summary>
    private static readonly Lazy<HashSet<string>> KnownCurrencies = new(() =>
        System.Globalization.CultureInfo.GetCultures(System.Globalization.CultureTypes.SpecificCultures)
            .Select(c => { try { return new System.Globalization.RegionInfo(c.Name).ISOCurrencySymbol; } catch { return null; } })
            .Where(code => code is { Length: 3 })
            .Select(code => code!)
            .ToHashSet(StringComparer.OrdinalIgnoreCase));

    public static bool IsKnownCurrency(string? code) =>
        code is not null && CurrencyCode().IsMatch(code) && (KnownCurrencies.Value.Count == 0 || KnownCurrencies.Value.Contains(code));

    public static bool IsStrongPassword(string? password) =>
        password is { Length: >= 8 } && password.Any(char.IsLetter) && password.Any(char.IsDigit);
}

public class SaveLookupItemRequestValidator : AbstractValidator<SaveLookupItemRequest>
{
    public SaveLookupItemRequestValidator()
    {
        RuleFor(x => x.Name).NotEmpty().WithMessage("Please enter a name.").MaximumLength(100);
        RuleFor(x => x.Description).MaximumLength(1000);
        RuleFor(x => x.Color)
            .Must(c => c is null || Rules.HexColor().IsMatch(c))
            .WithMessage("Choose a colour in #RRGGBB format.");
    }
}

public class ReorderRequestValidator : AbstractValidator<ReorderRequest>
{
    public ReorderRequestValidator()
    {
        RuleFor(x => x.Ids).NotEmpty()
            .Must(ids => ids.Distinct().Count() == ids.Count).WithMessage("Each item can appear only once.");
    }
}

public class CreateUserRequestValidator : AbstractValidator<CreateUserRequest>
{
    public CreateUserRequestValidator()
    {
        RuleFor(x => x.FullName).NotEmpty().WithMessage("Please enter the full name.").MaximumLength(150);
        RuleFor(x => x.Username).NotEmpty().WithMessage("Please enter a username.")
            .Matches(Rules.Username()).WithMessage(Rules.UsernameMessage);
        RuleFor(x => x.Email).EmailAddress().WithMessage("Please enter a valid email address.")
            .MaximumLength(254).When(x => !string.IsNullOrWhiteSpace(x.Email));
        RuleFor(x => x.RoleId).GreaterThan(0).WithMessage("Please choose a role.");
        RuleFor(x => x.Password).Must(Rules.IsStrongPassword).WithMessage(Rules.PasswordMessage);
    }
}

public class UpdateUserRequestValidator : AbstractValidator<UpdateUserRequest>
{
    public UpdateUserRequestValidator()
    {
        RuleFor(x => x.FullName).NotEmpty().WithMessage("Please enter the full name.").MaximumLength(150);
        RuleFor(x => x.Username).NotEmpty().WithMessage("Please enter a username.")
            .Matches(Rules.Username()).WithMessage(Rules.UsernameMessage);
        RuleFor(x => x.Email).EmailAddress().WithMessage("Please enter a valid email address.")
            .MaximumLength(254).When(x => !string.IsNullOrWhiteSpace(x.Email));
        RuleFor(x => x.RoleId).GreaterThan(0).WithMessage("Please choose a role.");
    }
}

public class ResetPasswordRequestValidator : AbstractValidator<ResetPasswordRequest>
{
    public ResetPasswordRequestValidator()
    {
        RuleFor(x => x.NewPassword).Must(Rules.IsStrongPassword).WithMessage(Rules.PasswordMessage);
    }
}

public class SaveCustomFieldRequestValidator : AbstractValidator<SaveCustomFieldRequest>
{
    public SaveCustomFieldRequestValidator()
    {
        RuleFor(x => x.Label).NotEmpty().WithMessage("Please enter a field name.").MaximumLength(100);
        RuleFor(x => x.FieldType)
            .Must(t => Enum.TryParse<CustomFieldType>(t, ignoreCase: true, out _))
            .WithMessage("Choose a field type.");

        RuleFor(x => x.Options)
            .Must(o => o is { Count: > 0 } && o.All(opt => !string.IsNullOrWhiteSpace(opt.Label)))
            .WithMessage("Add at least one option, and give every option a name.")
            .When(x => IsOptionType(x.FieldType));

        RuleFor(x => x.Options)
            .Must(o => o!.Select(opt => opt.Label.Trim().ToLowerInvariant()).Distinct().Count() == o!.Count)
            .WithMessage("Option names must be unique.")
            .When(x => IsOptionType(x.FieldType) && x.Options is { Count: > 0 } && x.Options.All(o => o.Label is not null));

        RuleForEach(x => x.Options).ChildRules(o => o.RuleFor(opt => opt.Label).MaximumLength(100));
    }

    private static bool IsOptionType(string? type) =>
        Enum.TryParse<CustomFieldType>(type, true, out var t) && t is CustomFieldType.Dropdown or CustomFieldType.MultiSelect;
}

public class SaveCaptureFieldsRequestValidator : AbstractValidator<SaveCaptureFieldsRequest>
{
    public SaveCaptureFieldsRequestValidator()
    {
        RuleFor(x => x.Fields).NotEmpty()
            .Must(f => f.Select(x => x.Key).Distinct().Count() == f.Count).WithMessage("Each field can appear only once.");
    }
}

public class SystemSettingsValidator : AbstractValidator<SystemSettingsDto>
{
    public SystemSettingsValidator()
    {
        RuleFor(x => x.CrmName).NotEmpty().WithMessage("Please enter the CRM name.").MaximumLength(60);
        RuleFor(x => x.Tagline).MaximumLength(160);
        RuleFor(x => x.LogoUrl)
            .Must(u => Uri.TryCreate(u, UriKind.Absolute, out var uri) && (uri.Scheme == "https" || uri.Scheme == "http"))
            .WithMessage("Enter a full image URL starting with https://")
            .When(x => !string.IsNullOrWhiteSpace(x.LogoUrl));
        RuleFor(x => x.Currency).Must(Rules.IsKnownCurrency)
            .WithMessage("Choose a valid currency, such as AED.");
        RuleFor(x => x.TimeZone).Must(tz => tz is not null && TimeZoneInfo.TryFindSystemTimeZoneById(tz, out _))
            .WithMessage("Choose a valid time zone.");
    }
}
