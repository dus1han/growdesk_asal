using DoctorCrm.Api.Data;
using DoctorCrm.Api.DTOs;
using DoctorCrm.Api.Entities;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace DoctorCrm.Api.Controllers;

[ApiController]
[Route("api/settings")]
public class SettingsController(AppDbContext db) : ControllerBase
{
    /// <summary>Public branding for the login screen: CRM name, tagline and logo.</summary>
    [HttpGet("branding")]
    [AllowAnonymous]
    public async Task<ActionResult<ApiResponse<BrandingDto>>> Branding(CancellationToken ct)
    {
        string[] keys = [SettingKeys.CrmName, SettingKeys.Tagline, SettingKeys.LogoUrl];
        var values = await db.SystemSettings.AsNoTracking()
            .Where(s => keys.Contains(s.Key))
            .ToDictionaryAsync(s => s.Key, s => s.Value, ct);

        var logo = values.GetValueOrDefault(SettingKeys.LogoUrl);
        return Ok(ApiResponse<BrandingDto>.Ok(new BrandingDto(
            values.GetValueOrDefault(SettingKeys.CrmName) ?? "GrowDesk",
            values.GetValueOrDefault(SettingKeys.Tagline) ?? "",
            string.IsNullOrWhiteSpace(logo) ? null : logo)));
    }
}
