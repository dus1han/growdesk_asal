using DoctorCrm.Api.Authorization;
using DoctorCrm.Api.DTOs;
using DoctorCrm.Api.Services;
using Microsoft.AspNetCore.Mvc;

namespace DoctorCrm.Api.Controllers;

[ApiController]
[Route("api/payments")]
[HasPermission(Permissions.PaymentsView)]
public class PaymentsController(PaymentService payments) : ControllerBase
{
    /// <summary>Payment entries, newest first. By default only each booking's current entry.</summary>
    [HttpGet]
    public async Task<ActionResult<ApiResponse<PagedResult<PaymentListItemDto>>>> List([FromQuery] PaymentQuery query, CancellationToken ct) =>
        Ok(ApiResponse<PagedResult<PaymentListItemDto>>.Ok(await payments.ListAsync(query, ct)));

    /// <summary>Collected and waived in the range; outstanding as of now.</summary>
    [HttpGet("summary")]
    public async Task<ActionResult<ApiResponse<PaymentSummaryDto>>> Summary([FromQuery] PaymentQuery query, CancellationToken ct) =>
        Ok(ApiResponse<PaymentSummaryDto>.Ok(await payments.SummaryAsync(query, ct)));

    /// <summary>The filtered list as an Excel workbook, with a total row.</summary>
    [HttpGet("export")]
    public async Task<IActionResult> Export([FromQuery] PaymentQuery query, CancellationToken ct)
    {
        var (bytes, fileName) = await payments.ExportAsync(query, User.GetUserId(), ct);
        return File(bytes, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", fileName);
    }
}

[ApiController]
[Route("api/bookings/{bookingId:int}/payments")]
[HasPermission(Permissions.PaymentsManage)]
public class BookingPaymentsController(PaymentService payments) : ControllerBase
{
    /// <summary>Settles a pending consultation payment. The pending entry stays in the history.</summary>
    [HttpPost]
    public async Task<ActionResult<ApiResponse<PaymentListItemDto>>> Record(int bookingId, RecordPaymentRequest request, CancellationToken ct) =>
        Ok(ApiResponse<PaymentListItemDto>.Ok(await payments.RecordAsync(bookingId, request, User.GetUserId(), ct), "Payment recorded."));
}
