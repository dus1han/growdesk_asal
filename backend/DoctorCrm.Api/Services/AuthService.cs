using DoctorCrm.Api.Authentication;
using DoctorCrm.Api.Data;
using DoctorCrm.Api.DTOs;
using DoctorCrm.Api.Entities;
using Microsoft.EntityFrameworkCore;

namespace DoctorCrm.Api.Services;

public record LoginResult(string Token, SessionDto Session);

public class AuthService(AppDbContext db, TokenService tokens, AuditService audit)
{
    // Verified against when the email is unknown, so a missing account takes as long as a wrong password.
    private static readonly string DummyHash = BCrypt.Net.BCrypt.HashPassword("dummy-password-for-timing", workFactor: 12);

    /// <summary>Returns null for any failure. The caller shows one generic message, never which part was wrong.</summary>
    public async Task<LoginResult?> LoginAsync(LoginRequest request, string? ipAddress, CancellationToken ct)
    {
        var email = request.Email.Trim().ToLowerInvariant();
        var user = await db.Users.SingleOrDefaultAsync(u => u.Email == email, ct);

        var passwordOk = BCrypt.Net.BCrypt.Verify(request.Password, user?.PasswordHash ?? DummyHash);
        if (user is null || !passwordOk || !user.IsActive)
        {
            audit.Record(user?.Id, AuditActions.UserLoginFailed, nameof(User), user?.Id,
                new { email, ipAddress, reason = user is null ? "unknown_email" : !passwordOk ? "bad_password" : "inactive" });
            await db.SaveChangesAsync(ct);
            return null;
        }

        user.LastLoginAt = DateTime.UtcNow;
        audit.Record(user.Id, AuditActions.UserLoggedIn, nameof(User), user.Id, new { ipAddress });
        await db.SaveChangesAsync(ct);

        var current = await GetCurrentUserAsync(user.Id, ct)
            ?? throw new InvalidOperationException("User vanished during login.");
        var (token, expiresAt) = tokens.CreateToken(user.Id, user.Email, user.FullName, current.Roles, current.Permissions);

        return new LoginResult(token, new SessionDto(current, expiresAt));
    }

    /// <summary>Loads the user fresh from the database, so role or status changes apply immediately.</summary>
    public async Task<CurrentUserDto?> GetCurrentUserAsync(int userId, CancellationToken ct)
    {
        var user = await db.Users
            .AsNoTracking()
            .AsSplitQuery()
            .Where(u => u.Id == userId && u.IsActive)
            .Select(u => new
            {
                u.Id,
                u.FullName,
                u.Email,
                Roles = u.UserRoles.Select(ur => ur.Role.Name).ToList(),
                Permissions = u.UserRoles
                    .SelectMany(ur => ur.Role.RolePermissions)
                    .Select(rp => rp.Permission.Key)
                    .Distinct()
                    .ToList(),
            })
            .SingleOrDefaultAsync(ct);

        return user is null
            ? null
            : new CurrentUserDto(user.Id, user.FullName, user.Email, user.Roles, user.Permissions.Order().ToList());
    }

    public async Task RecordLogoutAsync(int userId, CancellationToken ct)
    {
        audit.Record(userId, AuditActions.UserLoggedOut, nameof(User), userId);
        await db.SaveChangesAsync(ct);
    }
}
