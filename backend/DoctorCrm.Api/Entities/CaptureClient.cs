namespace DoctorCrm.Api.Entities;

/// <summary>What a connection is for. Each kind's token only works on its own API.</summary>
public enum CaptureClientKind
{
    /// <summary>The GrowDesk Capture toolbar (/api/capture).</summary>
    Toolbar,

    /// <summary>A WhatsApp chatbot that saves leads and books consultations (/api/bot).</summary>
    Bot,
}

/// <summary>
/// A connection the external capture tool signs in with (spec §36): one per PC or browser, so a
/// lost machine can be revoked on its own. The secret is shown once when the connection is
/// created; only its SHA-256 hash is stored.
/// </summary>
public class CaptureClient
{
    public int Id { get; set; }

    /// <summary>What the admin called it, e.g. "Reception PC".</summary>
    public string Name { get; set; } = string.Empty;

    /// <summary>Public identifier sent with the secret, e.g. "gdc_4f9a…".</summary>
    public string ClientId { get; set; } = string.Empty;

    public string SecretHash { get; set; } = string.Empty;

    public CaptureClientKind Kind { get; set; } = CaptureClientKind.Toolbar;

    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; }
    public int? CreatedById { get; set; }
    public User? CreatedBy { get; set; }
    public DateTime? LastUsedAt { get; set; }

    /// <summary>The toolbar version this PC last connected with, e.g. "1.0.7".</summary>
    public string? ExtensionVersion { get; set; }
    public DateTime? RevokedAt { get; set; }
}
