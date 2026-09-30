using DoctorCrm.Api.DTOs;
using Microsoft.AspNetCore.Authorization;

namespace DoctorCrm.Api.Authorization;

/// <summary>Marks an endpoint as usable while the signed-in user still has to change their password.</summary>
[AttributeUsage(AttributeTargets.Method | AttributeTargets.Class)]
public sealed class AllowWhilePasswordChangeRequiredAttribute : Attribute;

/// <summary>
/// Enforces the first-login password change on the server: until the user has chosen their own
/// password, every authenticated endpoint answers 403 except the ones that let them do so
/// (session check, change password) and anonymous ones (sign out, branding). The flag is read
/// from the database on every request, so it also applies to sessions that already exist.
/// </summary>
public class PasswordChangeGate(RequestDelegate next)
{
    public const string ErrorCode = "password_change_required";
    private const string ItemKey = "growdesk.mustChangePassword";

    public static void Flag(HttpContext context) => context.Items[ItemKey] = true;

    public async Task InvokeAsync(HttpContext context)
    {
        var endpoint = context.GetEndpoint();
        var blocked = context.Items.ContainsKey(ItemKey)
            && endpoint is not null
            && endpoint.Metadata.GetMetadata<IAllowAnonymous>() is null
            && endpoint.Metadata.GetMetadata<AllowWhilePasswordChangeRequiredAttribute>() is null;

        if (!blocked)
        {
            await next(context);
            return;
        }

        context.Response.StatusCode = StatusCodes.Status403Forbidden;
        await context.Response.WriteAsJsonAsync(ApiResponse.Fail(
            "Please choose a new password to continue.", [new ApiError(ErrorCode, "Password change required.")]));
    }
}
