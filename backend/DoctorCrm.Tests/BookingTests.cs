using System.Net;
using System.Net.Http.Json;
using DoctorCrm.Api.DTOs;

namespace DoctorCrm.Tests;

/// <summary>Booking state transitions and business rules (spec §19–§28, §67).</summary>
public class BookingIntegrationTests(ApiFactory factory) : IClassFixture<ApiFactory>
{
    private static int _seq;

    /// <summary>A far-future day no other test uses, so overlaps are only the ones a test creates.</summary>
    private static DateOnly NewDay() => new DateOnly(2031, 1, 1).AddDays(Interlocked.Increment(ref _seq));

    private static TimeOnly T(int h, int m = 0) => new(h, m);

    private async Task<HttpClient> AdminAsync()
    {
        var client = factory.CreateCookieClient();
        (await client.PostAsJsonAsync("/api/auth/login", new LoginRequest(ApiFactory.AdminUsername, ApiFactory.AdminPassword))).EnsureSuccessStatusCode();
        return client;
    }

    private static async Task<T> DataAsync<T>(HttpResponseMessage response)
    {
        var body = await response.Content.ReadFromJsonAsync<ApiResponse<T>>();
        Assert.True(body!.Success, body.Message);
        return body.Data!;
    }

    private static async Task<ApiResponse<object>> FailAsync(HttpResponseMessage response, HttpStatusCode expected)
    {
        Assert.Equal(expected, response.StatusCode);
        return (await response.Content.ReadFromJsonAsync<ApiResponse<object>>())!;
    }

    private async Task<(CustomerDetailDto Customer, List<LookupItemDto> Treatments)> NewCustomerAsync(HttpClient admin)
    {
        var treatments = await DataAsync<List<LookupItemDto>>(await admin.GetAsync("/api/treatments"));
        var n = Interlocked.Increment(ref _seq);
        var customer = await DataAsync<CustomerDetailDto>(await admin.PostAsJsonAsync("/api/customers",
            new SaveCustomerRequest($"Booking Customer {n}", $"052 {n + 2000000:0000000}", null, null, null, null, null, null,
                [treatments[0].Id], null, null, null, null)));
        return (customer, treatments);
    }

    private static CreateBookingRequest Book(int customerId, DateOnly day, TimeOnly start, TimeOnly end, int[] treatments, int? doctorId = null) =>
        new(customerId, doctorId, day, start, end, treatments, null);

    [Fact]
    public async Task Booking_moves_an_interested_customer_to_booked_and_shows_on_their_timeline()
    {
        var admin = await AdminAsync();
        var (customer, treatments) = await NewCustomerAsync(admin);
        Assert.Equal("interested", customer.Stage.SystemKey);

        var booking = await DataAsync<BookingDetailDto>(await admin.PostAsJsonAsync("/api/bookings",
            Book(customer.Id, NewDay(), T(10), T(10, 30), [treatments[0].Id, treatments[1].Id])));
        Assert.Equal("Booked", booking.Status);
        Assert.Equal(2, booking.Treatments.Count);
        Assert.Equal("booked", booking.CustomerStage.SystemKey);

        var activity = await DataAsync<List<ActivityDto>>(await admin.GetAsync($"/api/customers/{customer.Id}/activity"));
        Assert.Contains(activity, a => a.Action == "Booking Created");
        Assert.Contains(activity, a => a.Action == "Stage Changed");

        var list = await DataAsync<PagedResult<CustomerListItemDto>>(await admin.GetAsync($"/api/customers?search={Uri.EscapeDataString(customer.Name)}"));
        Assert.Equal(booking.Id, list.Items.Single().NextBooking!.Id);
    }

    [Fact]
    public async Task Overlaps_are_refused_per_doctor_but_back_to_back_is_fine()
    {
        var admin = await AdminAsync();
        var (customer, treatments) = await NewCustomerAsync(admin);
        var day = NewDay();
        int[] t = [treatments[0].Id];

        await DataAsync<BookingDetailDto>(await admin.PostAsJsonAsync("/api/bookings", Book(customer.Id, day, T(9), T(10), t)));

        var overlap = await FailAsync(await admin.PostAsJsonAsync("/api/bookings", Book(customer.Id, day, T(9, 30), T(10, 30), t)), HttpStatusCode.Conflict);
        Assert.Contains("overlaps", overlap.Message);

        // Starts exactly when the other ends.
        await DataAsync<BookingDetailDto>(await admin.PostAsJsonAsync("/api/bookings", Book(customer.Id, day, T(10), T(10, 30), t)));

        // A doctor's calendar is separate from the unassigned one.
        var roles = await DataAsync<List<RoleDto>>(await admin.GetAsync("/api/roles"));
        var doctor = await DataAsync<UserDto>(await admin.PostAsJsonAsync("/api/users",
            new CreateUserRequest("Dr Test", $"dr_test_{Interlocked.Increment(ref _seq)}", null, roles.Single(r => r.Name == "Doctor").Id, "Doctor-Pass-1")));
        await DataAsync<BookingDetailDto>(await admin.PostAsJsonAsync("/api/bookings", Book(customer.Id, day, T(9, 30), T(10, 30), t, doctor.Id)));

        var doctors = await DataAsync<List<NamedRef>>(await admin.GetAsync("/api/doctor-options"));
        Assert.Contains(doctors, d => d.Id == doctor.Id);
    }

    [Fact]
    public async Task Booking_needs_treatments_and_a_valid_time_range()
    {
        var admin = await AdminAsync();
        var (customer, treatments) = await NewCustomerAsync(admin);
        await FailAsync(await admin.PostAsJsonAsync("/api/bookings", Book(customer.Id, NewDay(), T(10), T(11), [])), HttpStatusCode.BadRequest);
        await FailAsync(await admin.PostAsJsonAsync("/api/bookings", Book(customer.Id, NewDay(), T(11), T(10), [treatments[0].Id])), HttpStatusCode.BadRequest);
    }

    [Theory]
    [InlineData(true, false, false)]  // date without treatment
    [InlineData(false, true, false)]  // treatment without date
    [InlineData(true, true, true)]    // both
    [InlineData(false, false, true)]  // neither
    public async Task Next_treatment_is_both_or_neither(bool withDate, bool withTreatment, bool valid)
    {
        var admin = await AdminAsync();
        var (customer, treatments) = await NewCustomerAsync(admin);
        var day = NewDay();
        var booking = await DataAsync<BookingDetailDto>(await admin.PostAsJsonAsync("/api/bookings", Book(customer.Id, day, T(12), T(12, 30), [treatments[0].Id])));
        var methods = await DataAsync<List<LookupItemDto>>(await admin.GetAsync("/api/payment-methods"));

        var request = new CompleteBookingRequest(250, "Paid", methods[0].Id,
            withDate ? day.AddDays(14) : null, withTreatment ? treatments[1].Id : null, null);
        var response = await admin.PostAsJsonAsync($"/api/bookings/{booking.Id}/complete", request);

        if (valid)
        {
            var done = await DataAsync<BookingDetailDto>(response);
            Assert.Equal(withDate, done.NextTreatmentDate is not null);
        }
        else
        {
            await FailAsync(response, HttpStatusCode.BadRequest);
        }
    }

    [Fact]
    public async Task Completing_records_the_charge_and_payment_and_moves_the_stage()
    {
        var admin = await AdminAsync();
        var (customer, treatments) = await NewCustomerAsync(admin);
        var booking = await DataAsync<BookingDetailDto>(await admin.PostAsJsonAsync("/api/bookings",
            Book(customer.Id, NewDay(), T(14), T(14, 30), [treatments[0].Id])));
        var methods = await DataAsync<List<LookupItemDto>>(await admin.GetAsync("/api/payment-methods"));

        // Paid needs a method.
        await FailAsync(await admin.PostAsJsonAsync($"/api/bookings/{booking.Id}/complete",
            new CompleteBookingRequest(300, "Paid", null, null, null, null)), HttpStatusCode.BadRequest);
        await FailAsync(await admin.PostAsJsonAsync($"/api/bookings/{booking.Id}/complete",
            new CompleteBookingRequest(-5, "Waived", null, null, null, null)), HttpStatusCode.BadRequest);

        var done = await DataAsync<BookingDetailDto>(await admin.PostAsJsonAsync($"/api/bookings/{booking.Id}/complete",
            new CompleteBookingRequest(300, "Paid", methods[0].Id, null, null, "Good candidate")));
        Assert.Equal("Completed", done.Status);
        Assert.Equal(300, done.ConsultationCharge);
        var payment = Assert.Single(done.Payments);
        Assert.Equal("Paid", payment.Status);
        Assert.NotNull(payment.PaymentDate);
        Assert.Equal("consultation_completed", done.CustomerStage.SystemKey);

        // A completed consultation is final.
        await FailAsync(await admin.PostAsJsonAsync($"/api/bookings/{booking.Id}/complete",
            new CompleteBookingRequest(300, "Paid", methods[0].Id, null, null, null)), HttpStatusCode.Conflict);
        await FailAsync(await admin.PostAsJsonAsync($"/api/bookings/{booking.Id}/reschedule",
            new RescheduleBookingRequest(NewDay(), T(9), T(9, 30), null)), HttpStatusCode.Conflict);
    }

    [Fact]
    public async Task Reschedule_keeps_the_original_with_no_charge_and_links_the_new_booking()
    {
        var admin = await AdminAsync();
        var (customer, treatments) = await NewCustomerAsync(admin);
        var day = NewDay();
        var original = await DataAsync<BookingDetailDto>(await admin.PostAsJsonAsync("/api/bookings",
            Book(customer.Id, day, T(15), T(16), [treatments[0].Id, treatments[2].Id])));

        // Moving within its own slot doesn't count as an overlap with itself.
        var moved = await DataAsync<BookingDetailDto>(await admin.PostAsJsonAsync($"/api/bookings/{original.Id}/reschedule",
            new RescheduleBookingRequest(day, T(15, 30), T(16, 30), null)));

        Assert.NotEqual(original.Id, moved.Id);
        Assert.Equal("Booked", moved.Status);
        Assert.Equal(original.Id, moved.RescheduledFrom!.Id);
        Assert.Equal(original.Treatments.Select(t => t.Id).Order(), moved.Treatments.Select(t => t.Id).Order());

        var old = await DataAsync<BookingDetailDto>(await admin.GetAsync($"/api/bookings/{original.Id}"));
        Assert.Equal("Rescheduled", old.Status);
        Assert.Equal(0, old.ConsultationCharge);
        Assert.Equal(moved.Id, old.RescheduledTo!.Id);

        await FailAsync(await admin.PostAsJsonAsync($"/api/bookings/{original.Id}/reschedule",
            new RescheduleBookingRequest(day, T(17), T(17, 30), null)), HttpStatusCode.Conflict);
    }

    [Fact]
    public async Task Cancel_needs_a_reason_and_is_final()
    {
        var admin = await AdminAsync();
        var (customer, treatments) = await NewCustomerAsync(admin);
        var booking = await DataAsync<BookingDetailDto>(await admin.PostAsJsonAsync("/api/bookings",
            Book(customer.Id, NewDay(), T(11), T(11, 30), [treatments[0].Id])));
        var reasons = await DataAsync<List<LookupItemDto>>(await admin.GetAsync("/api/cancellation-reasons"));

        await FailAsync(await admin.PostAsJsonAsync($"/api/bookings/{booking.Id}/cancel", new CancelBookingRequest(0, null)), HttpStatusCode.BadRequest);

        var cancelled = await DataAsync<BookingDetailDto>(await admin.PostAsJsonAsync($"/api/bookings/{booking.Id}/cancel",
            new CancelBookingRequest(reasons[0].Id, "Travelling")));
        Assert.Equal("Cancelled", cancelled.Status);
        Assert.Equal(reasons[0].Id, cancelled.CancellationReason!.Id);

        // Still in the database, still listed with its status.
        var history = await DataAsync<PagedResult<BookingListItemDto>>(await admin.GetAsync($"/api/bookings?customerId={customer.Id}"));
        Assert.Contains(history.Items, b => b.Id == booking.Id && b.Status == "Cancelled");

        await FailAsync(await admin.PostAsJsonAsync($"/api/bookings/{booking.Id}/no-show", new { }), HttpStatusCode.Conflict);
    }

    [Fact]
    public async Task No_show_only_on_or_after_the_booking_date()
    {
        var admin = await AdminAsync();
        var (customer, treatments) = await NewCustomerAsync(admin);
        var future = await DataAsync<BookingDetailDto>(await admin.PostAsJsonAsync("/api/bookings",
            Book(customer.Id, NewDay(), T(8), T(8, 30), [treatments[0].Id])));
        await FailAsync(await admin.PostAsJsonAsync($"/api/bookings/{future.Id}/no-show", new { }), HttpStatusCode.BadRequest);

        var past = await DataAsync<BookingDetailDto>(await admin.PostAsJsonAsync("/api/bookings",
            Book(customer.Id, new DateOnly(2024, 3, 1), T(8), T(8, 30), [treatments[0].Id])));
        var noShow = await DataAsync<BookingDetailDto>(await admin.PostAsJsonAsync($"/api/bookings/{past.Id}/no-show", new { }));
        Assert.Equal("NoShow", noShow.Status);
    }

    [Fact]
    public async Task History_filters_combine_and_the_export_matches_them()
    {
        var admin = await AdminAsync();
        var (customer, treatments) = await NewCustomerAsync(admin);
        var methods = await DataAsync<List<LookupItemDto>>(await admin.GetAsync("/api/payment-methods"));
        var day = NewDay();

        var paid = await DataAsync<BookingDetailDto>(await admin.PostAsJsonAsync("/api/bookings", Book(customer.Id, day, T(9), T(9, 30), [treatments[0].Id])));
        await DataAsync<BookingDetailDto>(await admin.PostAsJsonAsync($"/api/bookings/{paid.Id}/complete",
            new CompleteBookingRequest(400, "Paid", methods[0].Id, null, null, null)));
        var pending = await DataAsync<BookingDetailDto>(await admin.PostAsJsonAsync("/api/bookings", Book(customer.Id, day, T(10), T(10, 30), [treatments[1].Id])));
        await DataAsync<BookingDetailDto>(await admin.PostAsJsonAsync($"/api/bookings/{pending.Id}/complete",
            new CompleteBookingRequest(150, "Pending", null, null, null, null)));

        var range = $"from={day:yyyy-MM-dd}&to={day:yyyy-MM-dd}";
        var byPayment = await DataAsync<PagedResult<BookingListItemDto>>(await admin.GetAsync($"/api/bookings?{range}&paymentStatus=Paid"));
        Assert.Equal([paid.Id], byPayment.Items.Select(b => b.Id));
        var byTreatment = await DataAsync<PagedResult<BookingListItemDto>>(await admin.GetAsync($"/api/bookings?{range}&treatmentId={treatments[1].Id}"));
        Assert.Equal([pending.Id], byTreatment.Items.Select(b => b.Id));
        var bySearch = await DataAsync<PagedResult<BookingListItemDto>>(await admin.GetAsync($"/api/bookings?{range}&search={Uri.EscapeDataString(customer.Name)}"));
        Assert.Equal(2, bySearch.TotalCount);

        // The export contains exactly the filtered rows.
        var file = await admin.GetAsync($"/api/bookings/export?{range}&paymentStatus=Paid&sort=desc");
        Assert.Equal("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", file.Content.Headers.ContentType!.MediaType);
        using (var workbook = new ClosedXML.Excel.XLWorkbook(await file.Content.ReadAsStreamAsync()))
        {
            var sheet = workbook.Worksheet(1);
            var headers = sheet.Row(1).CellsUsed().Select(c => c.GetString()).ToList();
            Assert.Contains("Charge (AED)", headers);
            Assert.Equal(2, sheet.LastRowUsed()!.RowNumber()); // header + 1 row
            Assert.Equal(customer.Name, sheet.Cell(2, headers.IndexOf("Customer") + 1).GetString());
            Assert.Equal(400, sheet.Cell(2, headers.IndexOf("Charge (AED)") + 1).GetDouble());
        }

        // Without the payments permission, payment columns are left out.
        var roles = await DataAsync<List<RoleDto>>(await admin.GetAsync("/api/roles"));
        var username = $"staff_x{Interlocked.Increment(ref _seq)}";
        await DataAsync<UserDto>(await admin.PostAsJsonAsync("/api/users",
            new CreateUserRequest("Staff", username, null, roles.Single(r => r.Name == "Staff").Id, "Staff-Pass-1")));
        var staff = await factory.SignInNewUserAsync(username, "Staff-Pass-1");
        using (var workbook = new ClosedXML.Excel.XLWorkbook(await (await staff.GetAsync($"/api/bookings/export?{range}")).Content.ReadAsStreamAsync()))
        {
            var headers = workbook.Worksheet(1).Row(1).CellsUsed().Select(c => c.GetString()).ToList();
            Assert.DoesNotContain("Charge (AED)", headers);
            Assert.Contains("Customer", headers);
        }
    }

    [Fact]
    public async Task Staff_can_view_bookings_but_not_book_or_complete()
    {
        var admin = await AdminAsync();
        var (customer, treatments) = await NewCustomerAsync(admin);
        var booking = await DataAsync<BookingDetailDto>(await admin.PostAsJsonAsync("/api/bookings",
            Book(customer.Id, NewDay(), T(13), T(13, 30), [treatments[0].Id])));

        var roles = await DataAsync<List<RoleDto>>(await admin.GetAsync("/api/roles"));
        var username = $"staff_b{Interlocked.Increment(ref _seq)}";
        await DataAsync<UserDto>(await admin.PostAsJsonAsync("/api/users",
            new CreateUserRequest("Staff", username, null, roles.Single(r => r.Name == "Staff").Id, "Staff-Pass-1")));
        var staff = await factory.SignInNewUserAsync(username, "Staff-Pass-1");

        Assert.Equal(HttpStatusCode.OK, (await staff.GetAsync($"/api/bookings/{booking.Id}")).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, (await staff.PostAsJsonAsync("/api/bookings",
            Book(customer.Id, NewDay(), T(9), T(9, 30), [treatments[0].Id]))).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, (await staff.PostAsJsonAsync($"/api/bookings/{booking.Id}/complete",
            new CompleteBookingRequest(0, "Waived", null, null, null, null))).StatusCode);
    }
}
