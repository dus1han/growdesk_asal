using DoctorCrm.Api.Authentication;
using DoctorCrm.Api.Authorization;
using DoctorCrm.Api.DTOs;
using DoctorCrm.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace DoctorCrm.Api.Controllers;

/// <summary>
/// The API the external CRM Capture toolbar uses (spec §30–§36). The tool first exchanges its
/// connection's client ID and secret for a 15-minute token at <c>POST /api/capture/token</c>,
/// then sends it as <c>Authorization: Bearer …</c>. See docs/CAPTURE_API.md for examples.
/// </summary>
[ApiController]
[Route("api/capture")]
[Authorize(Policy = CaptureAuth.Policy)]
[EnableRateLimiting(RateLimitPolicies.Capture)]
public class CaptureController(CaptureClientService clients, CaptureService capture) : ControllerBase
{
    /// <summary>Exchanges client credentials for a short-lived access token.</summary>
    [HttpPost("token")]
    [AllowAnonymous]
    [EnableRateLimiting(RateLimitPolicies.CaptureToken)]
    public async Task<ActionResult<ApiResponse<CaptureTokenDto>>> Token(CaptureTokenRequest request, CancellationToken ct)
    {
        var version = Request.Headers["X-GrowDesk-Capture-Version"].FirstOrDefault()?.Trim();
        var token = await clients.IssueTokenAsync(request, HttpContext.Connection.RemoteIpAddress?.ToString(), version, ct);
        return token is null
            ? Unauthorized(ApiResponse.Fail("Invalid client ID or secret, or the connection was revoked."))
            : Ok(ApiResponse<CaptureTokenDto>.Ok(token));
    }

    /// <summary>The fields to show, in order, with which are required.</summary>
    [HttpGet("config")]
    public async Task<ActionResult<ApiResponse<CaptureConfigDto>>> Config(CancellationToken ct) =>
        Ok(ApiResponse<CaptureConfigDto>.Ok(await capture.ConfigAsync(ct)));

    /// <summary>Active treatments, in display order.</summary>
    [HttpGet("treatments")]
    public async Task<ActionResult<ApiResponse<IReadOnlyList<CaptureLookupDto>>>> Treatments(CancellationToken ct) =>
        Ok(ApiResponse<IReadOnlyList<CaptureLookupDto>>.Ok(await capture.TreatmentsAsync(ct)));

    /// <summary>Active stages, in display order, with their colours.</summary>
    [HttpGet("stages")]
    public async Task<ActionResult<ApiResponse<IReadOnlyList<CaptureLookupDto>>>> Stages(CancellationToken ct) =>
        Ok(ApiResponse<IReadOnlyList<CaptureLookupDto>>.Ok(await capture.StagesAsync(ct)));

    /// <summary>Active lead sources, in display order.</summary>
    [HttpGet("sources")]
    public async Task<ActionResult<ApiResponse<IReadOnlyList<CaptureLookupDto>>>> Sources(CancellationToken ct) =>
        Ok(ApiResponse<IReadOnlyList<CaptureLookupDto>>.Ok(await capture.SourcesAsync(ct)));

    /// <summary>Active custom fields with their options.</summary>
    [HttpGet("custom-fields")]
    public async Task<ActionResult<ApiResponse<IReadOnlyList<CaptureCustomFieldDto>>>> CustomFields(CancellationToken ct) =>
        Ok(ApiResponse<IReadOnlyList<CaptureCustomFieldDto>>.Ok(await capture.CustomFieldsAsync(ct)));

    /// <summary>Creates the customer, or updates the one with this WhatsApp number or Instagram name.</summary>
    [HttpPost("customers")]
    public async Task<ActionResult<ApiResponse<CaptureCustomerResultDto>>> Customers(CaptureCustomerRequest request, CancellationToken ct)
    {
        var result = await capture.CaptureAsync(request, User.Identity?.Name ?? "Capture tool", ct);
        return Ok(ApiResponse<CaptureCustomerResultDto>.Ok(result,
            result.Action == "created" ? $"{result.CustomerName} was added." : $"{result.CustomerName} was updated."));
    }
}

/// <summary>Admin: the connections the capture tool signs in with.</summary>
[ApiController]
[Route("api/admin/capture-clients")]
[HasPermission(Permissions.SettingsManage)]
public class CaptureClientsController(CaptureClientService clients) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<ApiResponse<IReadOnlyList<CaptureClientDto>>>> List(CancellationToken ct) =>
        Ok(ApiResponse<IReadOnlyList<CaptureClientDto>>.Ok(await clients.ListAsync(ct)));

    /// <summary>Creates a connection. The response is the only time the secret is shown.</summary>
    [HttpPost]
    public async Task<ActionResult<ApiResponse<CaptureClientCreatedDto>>> Create(CreateCaptureClientRequest request, CancellationToken ct) =>
        Ok(ApiResponse<CaptureClientCreatedDto>.Ok(await clients.CreateAsync(request, User.GetUserId(), ct), "Connection created."));

    /// <summary>Revokes a connection; the tool is refused on its next request.</summary>
    [HttpPost("{id:int}/revoke")]
    public async Task<ActionResult<ApiResponse<object>>> Revoke(int id, CancellationToken ct)
    {
        await clients.RevokeAsync(id, User.GetUserId(), ct);
        return Ok(ApiResponse.Ok("Connection revoked."));
    }
}
