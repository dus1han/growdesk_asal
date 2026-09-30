namespace DoctorCrm.Api.DTOs;

/// <summary>Query string for GET /api/payments (and its summary and export). Filters combine.</summary>
public record PaymentQuery
{
    /// <summary>Inclusive clinic-local dates on which the payment was recorded.</summary>
    public DateOnly? From { get; set; }
    public DateOnly? To { get; set; }
    /// <summary>Paid, Pending or Waived.</summary>
    public string? Status { get; set; }
    public int? PaymentMethodId { get; set; }
    public int? CustomerId { get; set; }
    /// <summary>Customer name, WhatsApp number or Instagram name.</summary>
    public string? Search { get; set; }
    /// <summary>Only each booking's latest payment entry (its current state). Default true.</summary>
    public bool CurrentOnly { get; set; } = true;
    public int Page { get; set; } = 1;
    public int PageSize { get; set; } = 25;
}

public record PaymentBookingRef(int Id, DateOnly Date, TimeOnly StartTime, IReadOnlyList<string> Treatments);

public record PaymentListItemDto(
    int Id,
    NamedRef Customer,
    PaymentBookingRef Booking,
    decimal Amount,
    string Status,
    NamedRef? Method,
    DateTime? PaymentDate,
    DateTime CreatedAt,
    string? RecordedBy,
    /// <summary>True when this is the booking's latest payment entry.</summary>
    bool IsCurrent);

/// <summary>
/// Totals for the filtered range. Collected and waived count entries recorded in the range;
/// outstanding is everything still pending now, whatever the range, because it is money owed today.
/// </summary>
public record PaymentSummaryDto(
    decimal Collected,
    int CollectedCount,
    decimal Outstanding,
    int OutstandingCount,
    decimal Waived,
    int WaivedCount,
    string Currency);

/// <summary>Settles a pending consultation payment. Adds a Paid entry; the pending entry stays in the history.</summary>
public record RecordPaymentRequest(int PaymentMethodId, DateOnly? PaymentDate);
