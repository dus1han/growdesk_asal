using DoctorCrm.Api.Authorization;
using DoctorCrm.Api.DTOs;
using DoctorCrm.Api.Services;
using Microsoft.AspNetCore.Mvc;

namespace DoctorCrm.Api.Controllers;

[ApiController]
[Route("api/custom-fields")]
public class CustomFieldsController(CustomFieldService fields) : ControllerBase
{
    /// <summary>Active fields for customer forms; <c>includeInactive=true</c> for the admin screen.</summary>
    [HttpGet]
    public async Task<ActionResult<ApiResponse<IReadOnlyList<CustomFieldDto>>>> List([FromQuery] bool includeInactive, CancellationToken ct) =>
        Ok(ApiResponse<IReadOnlyList<CustomFieldDto>>.Ok(await fields.ListAsync(includeInactive, ct)));

    [HttpPost]
    [HasPermission(Permissions.SettingsManage)]
    public async Task<ActionResult<ApiResponse<CustomFieldDto>>> Create(SaveCustomFieldRequest request, CancellationToken ct) =>
        Ok(ApiResponse<CustomFieldDto>.Ok(await fields.CreateAsync(request, User.GetUserId(), ct), "Field added."));

    [HttpPut("{id:int}")]
    [HasPermission(Permissions.SettingsManage)]
    public async Task<ActionResult<ApiResponse<CustomFieldDto>>> Update(int id, SaveCustomFieldRequest request, CancellationToken ct) =>
        Ok(ApiResponse<CustomFieldDto>.Ok(await fields.UpdateAsync(id, request, User.GetUserId(), ct), "Field saved."));

    [HttpPatch("{id:int}/active")]
    [HasPermission(Permissions.SettingsManage)]
    public async Task<ActionResult<ApiResponse<CustomFieldDto>>> SetActive(int id, SetActiveRequest request, CancellationToken ct) =>
        Ok(ApiResponse<CustomFieldDto>.Ok(await fields.SetActiveAsync(id, request.IsActive, User.GetUserId(), ct)));

    [HttpPut("reorder")]
    [HasPermission(Permissions.SettingsManage)]
    public async Task<ActionResult<ApiResponse<IReadOnlyList<CustomFieldDto>>>> Reorder(ReorderRequest request, CancellationToken ct) =>
        Ok(ApiResponse<IReadOnlyList<CustomFieldDto>>.Ok(await fields.ReorderAsync(request.Ids, User.GetUserId(), ct)));
}

/// <summary>Admin view of the capture tool's fields. The tool itself reads /api/capture/config (Milestone 7).</summary>
[ApiController]
[Route("api/admin/capture-fields")]
[HasPermission(Permissions.SettingsManage)]
public class CaptureFieldsController(CaptureConfigService capture) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<ApiResponse<IReadOnlyList<CaptureFieldDto>>>> List(CancellationToken ct) =>
        Ok(ApiResponse<IReadOnlyList<CaptureFieldDto>>.Ok(await capture.ListAsync(ct)));

    /// <summary>Saves every field's enabled/required flags and the order they are listed in.</summary>
    [HttpPut]
    public async Task<ActionResult<ApiResponse<IReadOnlyList<CaptureFieldDto>>>> Save(SaveCaptureFieldsRequest request, CancellationToken ct) =>
        Ok(ApiResponse<IReadOnlyList<CaptureFieldDto>>.Ok(await capture.SaveAsync(request.Fields, User.GetUserId(), ct),
            "Capture tool fields saved."));
}

[ApiController]
[Route("api/admin/settings")]
[HasPermission(Permissions.SettingsManage)]
public class SystemSettingsController(SettingsService settings) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<ApiResponse<SystemSettingsDto>>> Get(CancellationToken ct) =>
        Ok(ApiResponse<SystemSettingsDto>.Ok(await settings.GetAsync(ct)));

    [HttpPut]
    public async Task<ActionResult<ApiResponse<SystemSettingsDto>>> Save(SystemSettingsDto request, CancellationToken ct) =>
        Ok(ApiResponse<SystemSettingsDto>.Ok(await settings.SaveAsync(request, User.GetUserId(), ct), "Settings saved."));
}
