using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using Microsoft.Extensions.Options;

namespace DoctorCrm.Api.Authentication;

/// <summary>
/// Authentication for the external capture tool, kept apart from user sessions: its tokens use
/// their own audience, arrive as a Bearer header (never the cookie), and are only accepted by the
/// capture endpoints. A user's session likewise cannot call the capture API.
/// </summary>
public static class CaptureAuth
{
    public const string Scheme = "Capture";
    public const string Policy = "capture";
    public const string ClientClaim = "capture_client";
    public const int TokenMinutes = 15;

    public static string Audience(JwtOptions options) => options.Audience + ":capture";
}

public class CaptureTokenService(IOptions<JwtOptions> options)
{
    private readonly JwtOptions _options = options.Value;

    public (string Token, int ExpiresIn) CreateToken(int clientId, string name)
    {
        var claims = new List<Claim>
        {
            new(JwtRegisteredClaimNames.Sub, $"capture:{clientId}"),
            new(JwtRegisteredClaimNames.Name, name),
            new(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString("N")),
            new(CaptureAuth.ClientClaim, clientId.ToString()),
        };
        var token = new JwtSecurityToken(
            issuer: _options.Issuer,
            audience: CaptureAuth.Audience(_options),
            claims: claims,
            expires: DateTime.UtcNow.AddMinutes(CaptureAuth.TokenMinutes),
            signingCredentials: new Microsoft.IdentityModel.Tokens.SigningCredentials(
                TokenService.GetSigningKey(_options), Microsoft.IdentityModel.Tokens.SecurityAlgorithms.HmacSha256));
        return (new JwtSecurityTokenHandler().WriteToken(token), CaptureAuth.TokenMinutes * 60);
    }
}

public static class CaptureClaimsExtensions
{
    public static int? GetCaptureClientId(this ClaimsPrincipal user) =>
        int.TryParse(user.FindFirst(CaptureAuth.ClientClaim)?.Value, out var id) ? id : null;
}
