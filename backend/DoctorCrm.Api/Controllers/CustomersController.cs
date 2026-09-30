using DoctorCrm.Api.Authorization;
using DoctorCrm.Api.Data;
using DoctorCrm.Api.DTOs;
using DoctorCrm.Api.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace DoctorCrm.Api.Controllers;

[ApiController]
[Route("api/customers")]
[HasPermission(Permissions.CustomersView)]
public class CustomersController(CustomerService customers) : ControllerBase
{
    /// <summary>Paged, searchable, filterable customer list. Filters combine.</summary>
    [HttpGet]
    public async Task<ActionResult<ApiResponse<PagedResult<CustomerListItemDto>>>> List([FromQuery] CustomerQuery query, CancellationToken ct) =>
        Ok(ApiResponse<PagedResult<CustomerListItemDto>>.Ok(await customers.ListAsync(query, ct)));

    [HttpGet("{id:int}")]
    public async Task<ActionResult<ApiResponse<CustomerDetailDto>>> Get(int id, CancellationToken ct) =>
        Ok(ApiResponse<CustomerDetailDto>.Ok(await customers.GetAsync(id, ct)));

    [HttpGet("{id:int}/activity")]
    public async Task<ActionResult<ApiResponse<IReadOnlyList<ActivityDto>>>> Activity(int id, CancellationToken ct) =>
        Ok(ApiResponse<IReadOnlyList<ActivityDto>>.Ok(await customers.ActivityAsync(id, ct)));

    /// <summary>Creates a customer. 409 with the existing customer when the WhatsApp or Instagram is taken.</summary>
    [HttpPost]
    [HasPermission(Permissions.CustomersManage)]
    public async Task<ActionResult<ApiResponse<CustomerDetailDto>>> Create(SaveCustomerRequest request, CancellationToken ct) =>
        Ok(ApiResponse<CustomerDetailDto>.Ok(await customers.CreateAsync(request, User.GetUserId(), ct), "Customer created."));

    [HttpPut("{id:int}")]
    [HasPermission(Permissions.CustomersManage)]
    public async Task<ActionResult<ApiResponse<CustomerDetailDto>>> Update(int id, SaveCustomerRequest request, CancellationToken ct) =>
        Ok(ApiResponse<CustomerDetailDto>.Ok(await customers.UpdateAsync(id, request, User.GetUserId(), ct), "Customer saved."));
}

/// <summary>Active users for "Assigned to" pickers. Anyone who can see customers can see this list.</summary>
[ApiController]
[Route("api/user-options")]
[HasPermission(Permissions.CustomersView)]
public class UserOptionsController(AppDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<ApiResponse<IReadOnlyList<NamedRef>>>> List(CancellationToken ct) =>
        Ok(ApiResponse<IReadOnlyList<NamedRef>>.Ok(await db.Users.AsNoTracking()
            .Where(u => u.IsActive).OrderBy(u => u.FullName)
            .Select(u => new NamedRef(u.Id, u.FullName)).ToListAsync(ct)));
}
