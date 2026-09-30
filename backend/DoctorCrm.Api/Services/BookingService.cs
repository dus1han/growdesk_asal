using DoctorCrm.Api.Data;
using DoctorCrm.Api.DTOs;
using DoctorCrm.Api.Entities;
using Microsoft.EntityFrameworkCore;

namespace DoctorCrm.Api.Services;

/// <summary>
/// Consultation bookings (spec §19–§27). Only a Booked consultation can change: it can be
/// completed, rescheduled, cancelled or marked as a no-show, and every one of those is final.
/// Nothing is ever deleted.
/// </summary>
public class BookingService(AppDbContext db, AuditService audit, StageAutomation stages, ClinicClock clock)
{
    public const int MaxPageSize = 500;

    public async Task<PagedResult<BookingListItemDto>> ListAsync(BookingQuery q, CancellationToken ct)
    {
        var page = Math.Max(1, q.Page);
        var size = Math.Clamp(q.PageSize, 1, MaxPageSize);
        var query = db.Bookings.AsNoTracking();

        if (q.From is { } from) query = query.Where(b => b.BookingDate >= from);
        if (q.To is { } to) query = query.Where(b => b.BookingDate <= to);
        if (q.CustomerId is { } customerId) query = query.Where(b => b.CustomerId == customerId);
        if (q.DoctorId is { } doctorId) query = query.Where(b => b.DoctorId == doctorId);
        if (!string.IsNullOrWhiteSpace(q.Status))
        {
            var statuses = q.Status.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
                .Select(s => Enum.TryParse<BookingStatus>(s, true, out var st) ? st : (BookingStatus?)null)
                .Where(s => s is not null).Select(s => s!.Value).ToList();
            query = query.Where(b => statuses.Contains(b.Status));
        }

        query = q.Sort == "desc"
            ? query.OrderByDescending(b => b.BookingDate).ThenByDescending(b => b.StartTime)
            : query.OrderBy(b => b.BookingDate).ThenBy(b => b.StartTime);

        var total = await query.CountAsync(ct);
        var items = await query
            .Skip((page - 1) * size).Take(size)
            .Select(b => new BookingListItemDto(
                b.Id,
                new NamedRef(b.Customer.Id, b.Customer.Name),
                b.Doctor != null ? new NamedRef(b.Doctor.Id, b.Doctor.FullName) : null,
                b.BookingDate, b.StartTime, b.EndTime,
                b.Status.ToString(),
                b.Treatments.OrderBy(t => t.Treatment.DisplayOrder).Select(t => new NamedRef(t.TreatmentId, t.Treatment.Name)).ToList(),
                b.ConsultationCharge,
                b.Payments.OrderByDescending(p => p.Id).Select(p => p.Status.ToString()).FirstOrDefault()))
            .AsSplitQuery()
            .ToListAsync(ct);

        return new PagedResult<BookingListItemDto>(items, page, size, total);
    }

    public async Task<BookingDetailDto> GetAsync(int id, CancellationToken ct)
    {
        var b = await db.Bookings.AsNoTracking()
            .Include(x => x.Customer).ThenInclude(c => c.Stage)
            .Include(x => x.Doctor)
            .Include(x => x.Treatments).ThenInclude(t => t.Treatment)
            .Include(x => x.NextTreatment)
            .Include(x => x.CancellationReason)
            .Include(x => x.OriginalBooking)
            .Include(x => x.Payments).ThenInclude(p => p.PaymentMethod)
            .Include(x => x.Payments).ThenInclude(p => p.CreatedBy)
            .AsSplitQuery()
            .SingleOrDefaultAsync(x => x.Id == id, ct)
            ?? throw BusinessRuleException.NotFound("Booking");

        var next = await db.Bookings.AsNoTracking().Where(x => x.OriginalBookingId == id)
            .Select(x => new BookingLinkDto(x.Id, x.BookingDate, x.StartTime, x.Status.ToString())).FirstOrDefaultAsync(ct);

        return new BookingDetailDto(
            b.Id,
            new NamedRef(b.Customer.Id, b.Customer.Name),
            b.Customer.WhatsAppNumber is null ? null : ContactNormalizer.FormatPhone(b.Customer.WhatsAppNumber),
            new StageRef(b.Customer.Stage.Id, b.Customer.Stage.Name, b.Customer.Stage.Color, b.Customer.Stage.SystemKey),
            b.Doctor is null ? null : new NamedRef(b.Doctor.Id, b.Doctor.FullName),
            b.BookingDate, b.StartTime, b.EndTime, b.Status.ToString(),
            b.Treatments.OrderBy(t => t.Treatment.DisplayOrder).Select(t => new NamedRef(t.TreatmentId, t.Treatment.Name)).ToList(),
            b.Notes, b.ConsultationCharge, b.DoctorNotes, b.NextTreatmentDate,
            b.NextTreatment is null ? null : new NamedRef(b.NextTreatment.Id, b.NextTreatment.Name),
            b.CancellationReason is null ? null : new NamedRef(b.CancellationReason.Id, b.CancellationReason.Name),
            b.CancellationNote,
            b.OriginalBooking is null ? null
                : new BookingLinkDto(b.OriginalBooking.Id, b.OriginalBooking.BookingDate, b.OriginalBooking.StartTime, b.OriginalBooking.Status.ToString()),
            next,
            b.Payments.OrderByDescending(p => p.CreatedAt).Select(p => new PaymentDto(
                p.Id, p.Amount, p.Status.ToString(),
                p.PaymentMethod is null ? null : new NamedRef(p.PaymentMethod.Id, p.PaymentMethod.Name),
                p.PaymentDate, p.CreatedBy?.FullName, p.CreatedAt)).ToList(),
            b.CompletedAt, b.CancelledAt, b.RescheduledAt, b.NoShowAt, b.CreatedAt);
    }

    public async Task<BookingDetailDto> CreateAsync(CreateBookingRequest r, int? userId, CancellationToken ct)
    {
        var customer = await db.Customers.SingleOrDefaultAsync(c => c.Id == r.CustomerId && c.IsActive, ct)
            ?? throw new BusinessRuleException("Choose a customer.", field: "customerId");

        await EnsureDoctorAsync(r.DoctorId, null, ct);
        var treatmentIds = await ValidateTreatmentsAsync(r.TreatmentIds, new HashSet<int>(), ct);
        await EnsureNoOverlapAsync(r.Date, r.StartTime, r.EndTime, r.DoctorId, excludeId: null, ct);

        var booking = new Booking
        {
            CustomerId = customer.Id,
            DoctorId = r.DoctorId,
            BookingDate = r.Date,
            StartTime = r.StartTime,
            EndTime = r.EndTime,
            Notes = Clean(r.Notes),
            CreatedById = userId,
        };
        foreach (var id in treatmentIds) booking.Treatments.Add(new BookingTreatment { TreatmentId = id });
        db.Bookings.Add(booking);

        // Stage automation: Interested / Follow-up → Booked.
        await stages.MoveAsync(customer, [StageKeys.Interested, StageKeys.FollowUp], StageKeys.Booked, userId, "Consultation booked", ct);

        await db.SaveChangesAsync(ct);
        audit.Record(userId, "Booking Created", nameof(Booking), booking.Id,
            new { customerId = customer.Id, date = r.Date, start = r.StartTime });
        await db.SaveChangesAsync(ct);
        return await GetAsync(booking.Id, ct);
    }

    public async Task<BookingDetailDto> UpdateAsync(int id, UpdateBookingRequest r, int? userId, CancellationToken ct)
    {
        var booking = await LoadBookedAsync(id, "edited", ct);
        await EnsureDoctorAsync(r.DoctorId, booking.DoctorId, ct);

        var current = booking.Treatments.Select(t => t.TreatmentId).ToHashSet();
        var treatmentIds = await ValidateTreatmentsAsync(r.TreatmentIds, current, ct);

        if (r.DoctorId != booking.DoctorId)
            await EnsureNoOverlapAsync(booking.BookingDate, booking.StartTime, booking.EndTime, r.DoctorId, booking.Id, ct);

        booking.DoctorId = r.DoctorId;
        booking.Notes = Clean(r.Notes);
        foreach (var removed in booking.Treatments.Where(t => !treatmentIds.Contains(t.TreatmentId)).ToList())
            booking.Treatments.Remove(removed);
        foreach (var added in treatmentIds.Where(t => !current.Contains(t)))
            booking.Treatments.Add(new BookingTreatment { TreatmentId = added });

        audit.Record(userId, "Booking Updated", nameof(Booking), id, new { treatments = treatmentIds, r.DoctorId });
        await db.SaveChangesAsync(ct);
        return await GetAsync(id, ct);
    }

    public async Task<BookingDetailDto> CompleteAsync(int id, CompleteBookingRequest r, int? userId, CancellationToken ct)
    {
        var booking = await LoadBookedAsync(id, "completed", ct);
        var status = Enum.Parse<PaymentStatus>(r.PaymentStatus, ignoreCase: true);

        if (status == PaymentStatus.Paid && r.PaymentMethodId is null)
            throw new BusinessRuleException("Choose how the customer paid.", field: "paymentMethodId");
        int? methodId = status == PaymentStatus.Waived ? null : r.PaymentMethodId;
        if (methodId is { } m && !await db.PaymentMethods.AnyAsync(x => x.Id == m && x.IsActive, ct))
            throw new BusinessRuleException("Choose a valid payment method.", field: "paymentMethodId");

        // Next treatment: both or neither (spec §24). The validator checks too; this is the backstop.
        if ((r.NextTreatmentDate is null) != (r.NextTreatmentId is null))
            throw new BusinessRuleException("Enter both the next treatment and its date, or leave both empty.",
                field: r.NextTreatmentDate is null ? "nextTreatmentDate" : "nextTreatmentId");
        if (r.NextTreatmentId is { } nt && !await db.Treatments.AnyAsync(t => t.Id == nt && t.IsActive, ct))
            throw new BusinessRuleException("Choose a valid treatment.", field: "nextTreatmentId");
        if (r.NextTreatmentDate is { } nd && nd < booking.BookingDate)
            throw new BusinessRuleException("The next treatment can't be before this consultation.", field: "nextTreatmentDate");

        var now = DateTime.UtcNow;
        booking.Status = BookingStatus.Completed;
        booking.CompletedAt = now;
        booking.ConsultationCharge = r.ConsultationCharge;
        booking.DoctorNotes = Clean(r.DoctorNotes);
        booking.NextTreatmentDate = r.NextTreatmentDate;
        booking.NextTreatmentId = r.NextTreatmentId;

        booking.Payments.Add(new Payment
        {
            CustomerId = booking.CustomerId,
            Amount = r.ConsultationCharge,
            Status = status,
            PaymentMethodId = methodId,
            PaymentDate = status == PaymentStatus.Paid ? now : null,
            CreatedById = userId,
            CreatedAt = now,
        });

        // Stage automation: Booked → Consultation Completed.
        await stages.MoveAsync(booking.Customer, [StageKeys.Booked], StageKeys.ConsultationCompleted, userId, "Consultation completed", ct);

        audit.Record(userId, "Consultation Completed", nameof(Booking), id,
            new { charge = r.ConsultationCharge, payment = status.ToString(), nextTreatment = r.NextTreatmentDate });
        audit.Record(userId, "Payment Recorded", nameof(Booking), id, new { amount = r.ConsultationCharge, status = status.ToString() });
        await db.SaveChangesAsync(ct);
        return await GetAsync(id, ct);
    }

    /// <summary>
    /// The original becomes Rescheduled with no charge; a new Booked consultation keeps the
    /// customer, treatments and doctor and points back via OriginalBookingId (spec §25).
    /// </summary>
    public async Task<BookingDetailDto> RescheduleAsync(int id, RescheduleBookingRequest r, int? userId, CancellationToken ct)
    {
        var original = await LoadBookedAsync(id, "rescheduled", ct);
        var doctorId = r.DoctorId ?? original.DoctorId;
        await EnsureDoctorAsync(doctorId, original.DoctorId, ct);
        await EnsureNoOverlapAsync(r.Date, r.StartTime, r.EndTime, doctorId, excludeId: original.Id, ct);

        original.Status = BookingStatus.Rescheduled;
        original.RescheduledAt = DateTime.UtcNow;
        original.ConsultationCharge = 0;

        var replacement = new Booking
        {
            CustomerId = original.CustomerId,
            DoctorId = doctorId,
            BookingDate = r.Date,
            StartTime = r.StartTime,
            EndTime = r.EndTime,
            Notes = original.Notes,
            OriginalBookingId = original.Id,
            CreatedById = userId,
        };
        foreach (var t in original.Treatments) replacement.Treatments.Add(new BookingTreatment { TreatmentId = t.TreatmentId });
        db.Bookings.Add(replacement);
        await db.SaveChangesAsync(ct);

        audit.Record(userId, "Booking Rescheduled", nameof(Booking), original.Id,
            new { from = new { date = original.BookingDate, start = original.StartTime }, to = new { date = r.Date, start = r.StartTime }, newBookingId = replacement.Id });
        await db.SaveChangesAsync(ct);
        return await GetAsync(replacement.Id, ct);
    }

    public async Task<BookingDetailDto> CancelAsync(int id, CancelBookingRequest r, int? userId, CancellationToken ct)
    {
        var booking = await LoadBookedAsync(id, "cancelled", ct);
        var reason = await db.CancellationReasons.SingleOrDefaultAsync(x => x.Id == r.CancellationReasonId && x.IsActive, ct)
            ?? throw new BusinessRuleException("Choose a cancellation reason.", field: "cancellationReasonId");

        booking.Status = BookingStatus.Cancelled;
        booking.CancelledAt = DateTime.UtcNow;
        booking.CancellationReasonId = reason.Id;
        booking.CancellationNote = Clean(r.Note);

        audit.Record(userId, "Booking Cancelled", nameof(Booking), id, new { reason = reason.Name });
        await db.SaveChangesAsync(ct);
        return await GetAsync(id, ct);
    }

    public async Task<BookingDetailDto> MarkNoShowAsync(int id, int? userId, CancellationToken ct)
    {
        var booking = await LoadBookedAsync(id, "marked as a no-show", ct);
        if (booking.BookingDate > await clock.TodayAsync(ct))
            throw new BusinessRuleException("A booking can't be a no-show before its date.");

        booking.Status = BookingStatus.NoShow;
        booking.NoShowAt = DateTime.UtcNow;
        audit.Record(userId, "No Show", nameof(Booking), id);
        await db.SaveChangesAsync(ct);
        return await GetAsync(id, ct);
    }

    /// <summary>The single gate for status changes: only Booked consultations can move.</summary>
    private async Task<Booking> LoadBookedAsync(int id, string action, CancellationToken ct)
    {
        var booking = await db.Bookings
            .Include(b => b.Treatments)
            .Include(b => b.Customer)
            .SingleOrDefaultAsync(b => b.Id == id, ct)
            ?? throw BusinessRuleException.NotFound("Booking");

        if (booking.Status != BookingStatus.Booked)
            throw new BusinessRuleException(
                $"This booking is already {Describe(booking.Status)}, so it can't be {action}.", StatusCodes.Status409Conflict);
        return booking;
    }

    private async Task EnsureNoOverlapAsync(DateOnly date, TimeOnly start, TimeOnly end, int? doctorId, int? excludeId, CancellationToken ct)
    {
        var conflict = await db.Bookings.AsNoTracking()
            .Where(b => b.Status == BookingStatus.Booked && b.BookingDate == date && b.DoctorId == doctorId && b.Id != excludeId
                        && b.StartTime < end && start < b.EndTime)
            .OrderBy(b => b.StartTime)
            .Select(b => new BookingConflictDto(b.Id, b.Customer.Name, b.StartTime, b.EndTime))
            .FirstOrDefaultAsync(ct);

        if (conflict is not null)
            throw new BusinessRuleException(
                $"This time overlaps {conflict.CustomerName}'s consultation ({conflict.StartTime:HH\\:mm}–{conflict.EndTime:HH\\:mm}).",
                StatusCodes.Status409Conflict, "startTime") { Details = conflict };
    }

    private async Task EnsureDoctorAsync(int? doctorId, int? currentDoctorId, CancellationToken ct)
    {
        if (doctorId is { } d && d != currentDoctorId && !await db.Users.AnyAsync(u => u.Id == d && u.IsActive, ct))
            throw new BusinessRuleException("Choose an active doctor.", field: "doctorId");
    }

    private async Task<List<int>> ValidateTreatmentsAsync(IReadOnlyList<int> requested, IReadOnlySet<int> current, CancellationToken ct)
    {
        var ids = requested.Distinct().ToList();
        if (ids.Count == 0) throw new BusinessRuleException("Choose at least one treatment.", field: "treatmentIds");
        var valid = await db.Treatments.CountAsync(t => ids.Contains(t.Id) && (t.IsActive || current.Contains(t.Id)), ct);
        if (valid != ids.Count) throw new BusinessRuleException("One of the selected treatments is no longer available.", field: "treatmentIds");
        return ids;
    }

    private static string Describe(BookingStatus s) => s switch
    {
        BookingStatus.Completed => "completed",
        BookingStatus.Rescheduled => "rescheduled",
        BookingStatus.Cancelled => "cancelled",
        BookingStatus.NoShow => "marked as a no-show",
        _ => "booked",
    };

    private static string? Clean(string? s) => string.IsNullOrWhiteSpace(s) ? null : s.Trim();
}
