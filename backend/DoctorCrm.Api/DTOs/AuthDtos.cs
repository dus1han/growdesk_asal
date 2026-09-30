namespace DoctorCrm.Api.DTOs;

public record LoginRequest(string Username, string Password);

public record CurrentUserDto(
    int Id,
    string FullName,
    string Username,
    string? Email,
    IReadOnlyList<string> Roles,
    IReadOnlyList<string> Permissions,
    bool MustChangePassword);

public record ChangePasswordRequest(string CurrentPassword, string NewPassword);

public record SessionDto(CurrentUserDto User, DateTime ExpiresAt);

public record BrandingDto(string CrmName, string Tagline, string? LogoUrl);
