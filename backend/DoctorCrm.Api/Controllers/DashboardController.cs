using DoctorCrm.Api.Authorization;
using DoctorCrm.Api.DTOs;
using DoctorCrm.Api.Services;
using Microsoft.AspNetCore.Mvc;

namespace DoctorCrm.Api.Controllers;

[ApiController]
[Route("api/dashboard")]
[HasPermission(Permissions.DashboardView)]
public class DashboardController(DashboardService dashboard) : ControllerBase
{
    /// <summary>Today's figures, appointments, stage summary, follow-ups and recent activity.</summary>
    [HttpGet]
    public async Task<ActionResult<ApiResponse<DashboardDto>>> Get(CancellationToken ct) =>
        Ok(ApiResponse<DashboardDto>.Ok(await dashboard.GetAsync(User, ct)));
}
