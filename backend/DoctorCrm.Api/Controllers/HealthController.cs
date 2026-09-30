using DoctorCrm.Api.Data;
using DoctorCrm.Api.DTOs;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace DoctorCrm.Api.Controllers;

[ApiController]
[Route("api/health")]
[AllowAnonymous]
public class HealthController(AppDbContext db) : ControllerBase
{
    public record HealthDto(string Status, bool Database);

    /// <summary>Liveness plus a database round trip. Used by the container healthcheck.</summary>
    [HttpGet]
    public async Task<ActionResult<ApiResponse<HealthDto>>> Get(CancellationToken ct)
    {
        var dbOk = await db.Database.CanConnectAsync(ct);
        var body = ApiResponse<HealthDto>.Ok(new HealthDto(dbOk ? "healthy" : "degraded", dbOk));
        return dbOk ? Ok(body) : StatusCode(StatusCodes.Status503ServiceUnavailable, body);
    }
}
