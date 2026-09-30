using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using DoctorCrm.Api.DTOs;

namespace DoctorCrm.Tests;

/// <summary>The external capture tool's API (spec §30–§36): credentials, configuration, find-or-create.</summary>
public class CaptureTests(ApiFactory factory) : IClassFixture<ApiFactory>
{
    private static int _seq;

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

    private static async Task<ApiResponse<object>> BodyAsync(HttpResponseMessage response) =>
        (await response.Content.ReadFromJsonAsync<ApiResponse<object>>())!;

    /// <summary>A new connection, and a client already holding its token.</summary>
    private async Task<(CaptureClientCreatedDto Connection, HttpClient Tool)> ConnectAsync(HttpClient admin)
    {
        var created = await DataAsync<CaptureClientCreatedDto>(await admin.PostAsJsonAsync("/api/admin/capture-clients",
            new CreateCaptureClientRequest($"Reception PC {Interlocked.Increment(ref _seq)}")));
        var tool = factory.CreateClient();
        var token = await DataAsync<CaptureTokenDto>(await tool.PostAsJsonAsync("/api/capture/token",
            new CaptureTokenRequest(created.Client.ClientId, created.ClientSecret)));
        tool.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token.AccessToken);
        return (created, tool);
    }

    private static CaptureCustomerRequest Lead(string? name = null, string? whatsApp = null, string? instagram = null,
        int[]? treatments = null, int? stageId = null, string? email = null, string? notes = null,
        Dictionary<string, JsonElement>? custom = null) =>
        new(name, whatsApp, null, instagram, email, stageId, null, treatments, custom, notes);

    private static string Number() => $"054 72{Interlocked.Increment(ref _seq):00000}";

    private static async Task SetCaptureFieldsAsync(HttpClient admin, Func<CaptureFieldDto, (bool Enabled, bool Required)> choose)
    {
        var fields = await DataAsync<List<CaptureFieldDto>>(await admin.GetAsync("/api/admin/capture-fields"));
        var request = fields.Select(f => { var (e, r) = choose(f); return new SaveCaptureField(f.Key, e, r); }).ToList();
        await DataAsync<List<CaptureFieldDto>>(await admin.PutAsJsonAsync("/api/admin/capture-fields", new SaveCaptureFieldsRequest(request)));
    }

    private static readonly Func<CaptureFieldDto, (bool, bool)> Defaults = f => f.Key switch
    {
        "name" or "whatsapp" => (true, true),
        "secondary_phone" or "instagram" or "treatments" or "stage" => (true, false),
        _ => (false, false),
    };

    // ---- Credentials ----------------------------------------------------------------------------

    [Fact]
    public async Task Token_requires_the_right_secret_and_revoking_cuts_off_the_tool_at_once()
    {
        var admin = await AdminAsync();
        var (connection, tool) = await ConnectAsync(admin);
        Assert.StartsWith("gdc_", connection.Client.ClientId);
        Assert.Equal(HttpStatusCode.OK, (await tool.GetAsync("/api/capture/config")).StatusCode);

        // The secret is never listed again.
        var listed = await admin.GetStringAsync("/api/admin/capture-clients");
        Assert.DoesNotContain(connection.ClientSecret, listed);

        var anon = factory.CreateClient();
        Assert.Equal(HttpStatusCode.Unauthorized, (await anon.PostAsJsonAsync("/api/capture/token",
            new CaptureTokenRequest(connection.Client.ClientId, connection.ClientSecret + "x"))).StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, (await anon.PostAsJsonAsync("/api/capture/token",
            new CaptureTokenRequest("gdc_unknown", connection.ClientSecret))).StatusCode);

        (await admin.PostAsync($"/api/admin/capture-clients/{connection.Client.Id}/revoke", null)).EnsureSuccessStatusCode();
        Assert.Equal(HttpStatusCode.Unauthorized, (await tool.GetAsync("/api/capture/config")).StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, (await anon.PostAsJsonAsync("/api/capture/token",
            new CaptureTokenRequest(connection.Client.ClientId, connection.ClientSecret))).StatusCode);
    }

    [Fact]
    public async Task Connection_records_the_toolbar_version_it_connects_with()
    {
        var admin = await AdminAsync();
        var created = await DataAsync<CaptureClientCreatedDto>(await admin.PostAsJsonAsync("/api/admin/capture-clients",
            new CreateCaptureClientRequest($"Versioned PC {Interlocked.Increment(ref _seq)}")));

        async Task TokenWith(string version)
        {
            var tool = factory.CreateClient();
            var request = new HttpRequestMessage(HttpMethod.Post, "/api/capture/token")
            {
                Content = JsonContent.Create(new CaptureTokenRequest(created.Client.ClientId, created.ClientSecret)),
            };
            request.Headers.Add("X-GrowDesk-Capture-Version", version);
            (await tool.SendAsync(request)).EnsureSuccessStatusCode();
        }
        CaptureClientDto Listed(List<CaptureClientDto> all) => all.Single(c => c.Id == created.Client.Id);

        await TokenWith("1.0.7");
        Assert.Equal("1.0.7", Listed(await DataAsync<List<CaptureClientDto>>(await admin.GetAsync("/api/admin/capture-clients"))).ExtensionVersion);

        // Anything that isn't a version number is ignored; the last good one stays.
        await TokenWith("<script>");
        Assert.Equal("1.0.7", Listed(await DataAsync<List<CaptureClientDto>>(await admin.GetAsync("/api/admin/capture-clients"))).ExtensionVersion);
    }

    [Fact]
    public async Task Capture_tokens_and_user_sessions_do_not_cross_over()
    {
        var admin = await AdminAsync();
        var (_, tool) = await ConnectAsync(admin);

        Assert.Equal(HttpStatusCode.Unauthorized, (await admin.GetAsync("/api/capture/config")).StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, (await factory.CreateClient().GetAsync("/api/capture/config")).StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, (await tool.GetAsync("/api/customers")).StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, (await tool.GetAsync("/api/admin/capture-clients")).StatusCode);
    }

    // ---- Configuration --------------------------------------------------------------------------

    [Fact]
    public async Task Config_and_lists_come_from_the_admin_settings()
    {
        var admin = await AdminAsync();
        await SetCaptureFieldsAsync(admin, Defaults);
        var (_, tool) = await ConnectAsync(admin);

        var config = await DataAsync<CaptureConfigDto>(await tool.GetAsync("/api/capture/config"));
        Assert.Equal(config.Fields.OrderBy(f => f.Order).Select(f => f.Key), config.Fields.Select(f => f.Key));
        Assert.Contains(config.Fields, f => f is { Key: "whatsapp", Enabled: true, Required: true, Type: "phone" });
        Assert.Contains(config.Fields, f => f is { Key: "email", Enabled: false });

        Assert.NotEmpty(await DataAsync<List<CaptureLookupDto>>(await tool.GetAsync("/api/capture/treatments")));
        Assert.Contains(await DataAsync<List<CaptureLookupDto>>(await tool.GetAsync("/api/capture/stages")), s => s.Name == "Interested" && s.Color != null);
        Assert.Contains(await DataAsync<List<CaptureLookupDto>>(await tool.GetAsync("/api/capture/sources")), s => s.Name == "Instagram");
        Assert.NotNull(await DataAsync<List<CaptureCustomFieldDto>>(await tool.GetAsync("/api/capture/custom-fields")));
    }

    // ---- Capturing ------------------------------------------------------------------------------

    [Fact]
    public async Task Same_number_in_another_format_updates_and_merges_treatments()
    {
        var admin = await AdminAsync();
        await SetCaptureFieldsAsync(admin, Defaults);
        var (connection, tool) = await ConnectAsync(admin);
        var treatments = await DataAsync<List<CaptureLookupDto>>(await tool.GetAsync("/api/capture/treatments"));
        var number = Number();

        var first = await DataAsync<CaptureCustomerResultDto>(await tool.PostAsJsonAsync("/api/capture/customers",
            Lead("Nadia Perera", number, treatments: [treatments[0].Id], email: "ignored@example.com")));
        Assert.Equal("created", first.Action);

        var customer = await DataAsync<CustomerDetailDto>(await admin.GetAsync($"/api/customers/{first.CustomerId}"));
        Assert.Equal("interested", customer.Stage.SystemKey);
        Assert.Null(customer.Email); // email is switched off in the capture configuration
        Assert.NotNull(customer.LastContactDate);

        // +971 form of the same local number, a second treatment and an Instagram name.
        var international = "+971 " + number[1..];
        var second = await DataAsync<CaptureCustomerResultDto>(await tool.PostAsJsonAsync("/api/capture/customers",
            Lead("Nadia Perera", international, instagram: "nadia.p", treatments: [treatments[1].Id])));
        Assert.Equal("updated", second.Action);
        Assert.Equal(first.CustomerId, second.CustomerId);

        customer = await DataAsync<CustomerDetailDto>(await admin.GetAsync($"/api/customers/{first.CustomerId}"));
        Assert.Equal([treatments[0].Id, treatments[1].Id], customer.Treatments.Select(t => t.Id).Order());
        Assert.Equal("nadia.p", customer.Instagram);

        // The activity records which connection captured the lead.
        var activity = await DataAsync<List<ActivityDto>>(await admin.GetAsync($"/api/customers/{first.CustomerId}/activity"));
        var created = activity.Single(a => a.Action == "Customer Created");
        Assert.Equal("capture", created.Details!.Value.GetProperty("source").GetString());
        Assert.Equal(connection.Client.Name, created.Details!.Value.GetProperty("client").GetString());
        Assert.Contains(activity, a => a.Action == "Treatment Added");
    }

    [Fact]
    public async Task Required_fields_follow_the_capture_configuration()
    {
        var admin = await AdminAsync();
        await SetCaptureFieldsAsync(admin, Defaults);
        var (_, tool) = await ConnectAsync(admin);

        var missing = await tool.PostAsJsonAsync("/api/capture/customers", Lead(name: "No Number"));
        Assert.Equal(HttpStatusCode.BadRequest, missing.StatusCode);
        Assert.Equal("Required: WhatsApp Number.", (await BodyAsync(missing)).Message);

        var bad = await tool.PostAsJsonAsync("/api/capture/customers", Lead("Bad Number", "12"));
        Assert.Equal(HttpStatusCode.BadRequest, bad.StatusCode);

        // Instagram leads: only Instagram required, found again by Instagram name alone.
        await SetCaptureFieldsAsync(admin, f => f.Key switch
        {
            "instagram" => (true, true),
            "name" or "whatsapp" => (true, false),
            _ => Defaults(f),
        });
        var byHandle = await DataAsync<CaptureCustomerResultDto>(await tool.PostAsJsonAsync("/api/capture/customers",
            Lead(instagram: "@Lead.Only")));
        Assert.Equal("created", byHandle.Action);
        Assert.Equal("@lead.only", byHandle.CustomerName); // no name captured: the handle stands in

        var number = Number();
        var again = await DataAsync<CaptureCustomerResultDto>(await tool.PostAsJsonAsync("/api/capture/customers",
            Lead("Leila Only", number, "lead.only")));
        Assert.Equal("updated", again.Action);
        Assert.Equal(byHandle.CustomerId, again.CustomerId);
        var customer = await DataAsync<CustomerDetailDto>(await admin.GetAsync($"/api/customers/{again.CustomerId}"));
        Assert.Equal("Leila Only", customer.Name);
        Assert.NotNull(customer.WhatsApp);

        await SetCaptureFieldsAsync(admin, Defaults);
    }

    [Fact]
    public async Task A_booked_customer_is_not_moved_back_to_a_lead_stage()
    {
        var admin = await AdminAsync();
        await SetCaptureFieldsAsync(admin, Defaults);
        var (_, tool) = await ConnectAsync(admin);
        var stages = await DataAsync<List<CaptureLookupDto>>(await tool.GetAsync("/api/capture/stages"));
        var treatments = await DataAsync<List<CaptureLookupDto>>(await tool.GetAsync("/api/capture/treatments"));
        var number = Number();

        var lead = await DataAsync<CaptureCustomerResultDto>(await tool.PostAsJsonAsync("/api/capture/customers", Lead("Booked Bina", number)));
        await DataAsync<BookingDetailDto>(await admin.PostAsJsonAsync("/api/bookings",
            new CreateBookingRequest(lead.CustomerId, null, new DateOnly(2027, 1, 5), new TimeOnly(10, 0), new TimeOnly(10, 30), [treatments[0].Id], null)));

        var result = await DataAsync<CaptureCustomerResultDto>(await tool.PostAsJsonAsync("/api/capture/customers",
            Lead("Booked Bina", number, stageId: stages.Single(s => s.Name == "Interested").Id)));
        Assert.Contains(result.Warnings, w => w.StartsWith("Stage stays Booked"));
        var customer = await DataAsync<CustomerDetailDto>(await admin.GetAsync($"/api/customers/{lead.CustomerId}"));
        Assert.Equal("booked", customer.Stage.SystemKey);

        // A lead can still move between the lead stages.
        var other = await DataAsync<CaptureCustomerResultDto>(await tool.PostAsJsonAsync("/api/capture/customers", Lead("Fresh Farah", Number())));
        var moved = await DataAsync<CaptureCustomerResultDto>(await tool.PostAsJsonAsync("/api/capture/customers",
            Lead("Fresh Farah", (await DataAsync<CustomerDetailDto>(await admin.GetAsync($"/api/customers/{other.CustomerId}"))).WhatsApp,
                stageId: stages.Single(s => s.Name == "Follow-up").Id)));
        Assert.Empty(moved.Warnings);
    }

    [Fact]
    public async Task Required_custom_field_is_validated_and_saved()
    {
        var admin = await AdminAsync();
        var field = await DataAsync<CustomFieldDto>(await admin.PostAsJsonAsync("/api/custom-fields",
            new SaveCustomFieldRequest("Preferred Clinic", "Dropdown", false, [new SaveCustomFieldOption(null, "Downtown"), new SaveCustomFieldOption(null, "Marina")])));
        await SetCaptureFieldsAsync(admin, f => f.Key == field.Key ? (true, true) : Defaults(f));
        var (_, tool) = await ConnectAsync(admin);

        var config = await DataAsync<CaptureConfigDto>(await tool.GetAsync("/api/capture/config"));
        var captureField = config.Fields.Single(f => f.Key == field.Key);
        Assert.True(captureField.Required);
        Assert.Equal(["Downtown", "Marina"], captureField.Options!.Select(o => o.Label));

        var missing = await tool.PostAsJsonAsync("/api/capture/customers", Lead("Custom Cara", Number()));
        Assert.Equal("Required: Preferred Clinic.", (await BodyAsync(missing)).Message);

        var marina = captureField.Options!.Single(o => o.Label == "Marina").Id;
        var saved = await DataAsync<CaptureCustomerResultDto>(await tool.PostAsJsonAsync("/api/capture/customers",
            Lead("Custom Cara", Number(), custom: new() { [field.Key] = JsonSerializer.SerializeToElement(marina) })));
        var customer = await DataAsync<CustomerDetailDto>(await admin.GetAsync($"/api/customers/{saved.CustomerId}"));
        Assert.Equal("Marina", customer.CustomFields.Single(v => v.Key == field.Key).Display);

        await SetCaptureFieldsAsync(admin, Defaults);
    }
}
