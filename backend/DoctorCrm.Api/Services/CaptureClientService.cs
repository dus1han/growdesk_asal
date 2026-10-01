using System.Security.Cryptography;
using System.Text;
using DoctorCrm.Api.Authentication;
using DoctorCrm.Api.Data;
using DoctorCrm.Api.DTOs;
using DoctorCrm.Api.Entities;
using Microsoft.EntityFrameworkCore;

namespace DoctorCrm.Api.Services;

/// <summary>Capture tool connections: create, list, revoke, and exchange credentials for a token.</summary>
public class CaptureClientService(AppDbContext db, AuditService audit, CaptureTokenService tokens)
{
    public async Task<IReadOnlyList<CaptureClientDto>> ListAsync(CancellationToken ct) =>
        await db.CaptureClients.AsNoTracking()
            .OrderByDescending(c => c.IsActive).ThenByDescending(c => c.CreatedAt)
            .Select(c => new CaptureClientDto(c.Id, c.Name, c.ClientId, c.IsActive, c.CreatedAt,
                c.CreatedBy != null ? c.CreatedBy.FullName : null, c.LastUsedAt, c.RevokedAt, c.ExtensionVersion, c.Kind.ToString()))
            .ToListAsync(ct);

    public async Task<CaptureClientCreatedDto> CreateAsync(CreateCaptureClientRequest request, int? userId, CancellationToken ct)
    {
        var name = request.Name.Trim();
        var kind = CaptureClientKind.Toolbar;
        if (!string.IsNullOrWhiteSpace(request.Kind) && !Enum.TryParse(request.Kind, ignoreCase: true, out kind))
            throw new BusinessRuleException("Choose Toolbar or Bot.", field: "kind");
        if (await db.CaptureClients.AnyAsync(c => c.IsActive && c.Name.ToLower() == name.ToLower(), ct))
            throw BusinessRuleException.Conflict("An active connection already has this name.", "name");

        var secret = "gds_" + Random(32);
        var client = new CaptureClient
        {
            Name = name,
            ClientId = "gdc_" + Random(16),
            SecretHash = Hash(secret),
            CreatedAt = DateTime.UtcNow,
            CreatedById = userId,
            Kind = kind,
        };
        db.CaptureClients.Add(client);
        await db.SaveChangesAsync(ct);

        audit.Record(userId, "Capture Connection Created", nameof(CaptureClient), client.Id, new { client.Name, client.ClientId, kind = kind.ToString() });
        await db.SaveChangesAsync(ct);
        return new CaptureClientCreatedDto((await ListAsync(ct)).Single(c => c.Id == client.Id), secret);
    }

    /// <summary>Revoking takes effect on the tool's next request, not when its token expires.</summary>
    public async Task RevokeAsync(int id, int? userId, CancellationToken ct)
    {
        var client = await db.CaptureClients.SingleOrDefaultAsync(c => c.Id == id, ct)
            ?? throw BusinessRuleException.NotFound("Connection");
        if (!client.IsActive) return;

        client.IsActive = false;
        client.RevokedAt = DateTime.UtcNow;
        audit.Record(userId, "Capture Connection Revoked", nameof(CaptureClient), id, new { client.Name, client.ClientId });
        await db.SaveChangesAsync(ct);
    }

    /// <summary>Returns null for any failure, so a caller can't tell an unknown ID from a wrong secret.</summary>
    /// <param name="extensionVersion">The toolbar's version (X-GrowDesk-Capture-Version), kept for the Connections list.</param>
    public async Task<CaptureTokenDto?> IssueTokenAsync(CaptureTokenRequest request, string? ipAddress, string? extensionVersion, CancellationToken ct)
    {
        var clientId = request.ClientId.Trim();
        var client = await db.CaptureClients.SingleOrDefaultAsync(c => c.ClientId == clientId, ct);
        var ok = client is { IsActive: true }
                 && CryptographicOperations.FixedTimeEquals(Encoding.UTF8.GetBytes(client.SecretHash), Encoding.UTF8.GetBytes(Hash(request.ClientSecret.Trim())));

        if (!ok)
        {
            audit.Record(null, "Capture Token Refused", nameof(CaptureClient), client?.Id,
                new { clientId, ipAddress, reason = client is null ? "unknown_client" : !client.IsActive ? "revoked" : "bad_secret" });
            await db.SaveChangesAsync(ct);
            return null;
        }

        client!.LastUsedAt = DateTime.UtcNow;
        if (extensionVersion is not null && System.Text.RegularExpressions.Regex.IsMatch(extensionVersion, @"^\d{1,4}(\.\d{1,5}){0,3}$"))
            client.ExtensionVersion = extensionVersion;
        await db.SaveChangesAsync(ct);
        var (token, expiresIn) = tokens.CreateToken(client.Id, client.Name);
        return new CaptureTokenDto(token, "Bearer", expiresIn);
    }

    public static string Hash(string secret) => Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(secret)));

    private static string Random(int bytes) => Convert.ToHexString(RandomNumberGenerator.GetBytes(bytes)).ToLowerInvariant();
}
