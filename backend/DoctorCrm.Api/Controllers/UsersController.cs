using DoctorCrm.Api.Authorization;
using DoctorCrm.Api.DTOs;
using DoctorCrm.Api.Services;
using Microsoft.AspNetCore.Mvc;

namespace DoctorCrm.Api.Controllers;

[ApiController]
[Route("api/users")]
[HasPermission(Permissions.UsersManage)]
public class UsersController(UserService users) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<ApiResponse<IReadOnlyList<UserDto>>>> List([FromQuery] string? search, CancellationToken ct) =>
        Ok(ApiResponse<IReadOnlyList<UserDto>>.Ok(await users.ListAsync(search, ct)));

    [HttpPost]
    public async Task<ActionResult<ApiResponse<UserDto>>> Create(CreateUserRequest request, CancellationToken ct) =>
        Ok(ApiResponse<UserDto>.Ok(await users.CreateAsync(request, User.GetUserId(), ct), "User created."));

    [HttpPut("{id:int}")]
    public async Task<ActionResult<ApiResponse<UserDto>>> Update(int id, UpdateUserRequest request, CancellationToken ct) =>
        Ok(ApiResponse<UserDto>.Ok(await users.UpdateAsync(id, request, User.GetUserId(), ct), "User saved."));

    [HttpPatch("{id:int}/active")]
    public async Task<ActionResult<ApiResponse<UserDto>>> SetActive(int id, SetActiveRequest request, CancellationToken ct) =>
        Ok(ApiResponse<UserDto>.Ok(await users.SetActiveAsync(id, request.IsActive, User.GetUserId(), ct)));

    [HttpPost("{id:int}/reset-password")]
    public async Task<ActionResult<ApiResponse<object>>> ResetPassword(int id, ResetPasswordRequest request, CancellationToken ct)
    {
        await users.ResetPasswordAsync(id, request.NewPassword, User.GetUserId(), ct);
        return Ok(ApiResponse.Ok("Password reset."));
    }
}

[ApiController]
[Route("api/roles")]
[HasPermission(Permissions.UsersManage)]
public class RolesController(UserService users) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<ApiResponse<IReadOnlyList<RoleDto>>>> List(CancellationToken ct) =>
        Ok(ApiResponse<IReadOnlyList<RoleDto>>.Ok(await users.ListRolesAsync(ct)));
}
