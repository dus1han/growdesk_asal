using System.Security.Claims;
using DoctorCrm.Api.Authentication;
using DoctorCrm.Api.Authorization;
using DoctorCrm.Api.DTOs;
using DoctorCrm.Api.Validators;
using Microsoft.AspNetCore.Authorization;

namespace DoctorCrm.Tests;

public class LoginRequestValidatorTests
{
    private readonly LoginRequestValidator _validator = new();

    [Theory]
    [InlineData("", "secret", "username")]
    [InlineData("   ", "secret", "username")]
    [InlineData("Dev_Admin", "", "password")]
    public void Rejects_invalid_input(string username, string password, string field)
    {
        var result = _validator.Validate(new LoginRequest(username, password));
        Assert.Contains(result.Errors, e => e.PropertyName.Equals(field, StringComparison.OrdinalIgnoreCase));
    }

    [Fact]
    public void Accepts_valid_input() =>
        Assert.True(_validator.Validate(new LoginRequest("Dev_Admin", "secret")).IsValid);
}

public class PermissionTests
{
    [Fact]
    public void Admin_holds_every_permission() =>
        Assert.Equal(Permissions.All.Order(), Roles.DefaultPermissions[Roles.Admin].Order());

    [Fact]
    public void Every_role_permission_is_a_known_key()
    {
        var known = Permissions.All.ToHashSet();
        Assert.All(Roles.DefaultPermissions.Values.SelectMany(p => p), p => Assert.Contains(p, known));
    }

    [Fact]
    public void Staff_cannot_reach_administration() =>
        Assert.DoesNotContain(Permissions.AdminAccess, Roles.DefaultPermissions[Roles.Staff]);

    [Theory]
    [InlineData(true)]
    [InlineData(false)]
    public async Task Handler_succeeds_only_with_the_permission_claim(bool hasClaim)
    {
        var claims = hasClaim ? new[] { new Claim(CrmClaims.Permission, Permissions.CustomersView) } : [];
        var user = new ClaimsPrincipal(new ClaimsIdentity(claims, "test"));
        var requirement = new PermissionRequirement(Permissions.CustomersView);
        var context = new AuthorizationHandlerContext([requirement], user, null);

        await new PermissionHandler().HandleAsync(context);

        Assert.Equal(hasClaim, context.HasSucceeded);
    }
}
