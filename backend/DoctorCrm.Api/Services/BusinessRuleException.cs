namespace DoctorCrm.Api.Services;

/// <summary>
/// A request that breaks a business rule ("a treatment with this name already exists", "you
/// cannot deactivate yourself"). The message is written for the end user and is returned as-is
/// by ExceptionMiddleware, unlike unexpected exceptions which are hidden behind a generic message.
/// </summary>
public class BusinessRuleException(string message, int statusCode = StatusCodes.Status400BadRequest, string? field = null)
    : Exception(message)
{
    public int StatusCode { get; } = statusCode;
    public string? Field { get; } = field;

    public static BusinessRuleException NotFound(string what) => new($"{what} not found.", StatusCodes.Status404NotFound);

    public static BusinessRuleException Conflict(string message, string? field = null) =>
        new(message, StatusCodes.Status409Conflict, field);
}

public static class ClaimsPrincipalExtensions
{
    public static int? GetUserId(this System.Security.Claims.ClaimsPrincipal user) =>
        int.TryParse(user.FindFirst(System.IdentityModel.Tokens.Jwt.JwtRegisteredClaimNames.Sub)?.Value, out var id) ? id : null;
}
