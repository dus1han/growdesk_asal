using System.IdentityModel.Tokens.Jwt;
using System.Threading.RateLimiting;
using DoctorCrm.Api.Authentication;
using DoctorCrm.Api.Authorization;
using DoctorCrm.Api.Controllers;
using DoctorCrm.Api.Data;
using DoctorCrm.Api.DTOs;
using DoctorCrm.Api.Middleware;
using DoctorCrm.Api.Services;
using DoctorCrm.Api.Validators;
using FluentValidation;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;
using Serilog;

var builder = WebApplication.CreateBuilder(args);

builder.Host.UseSerilog((ctx, cfg) => cfg
    .ReadFrom.Configuration(ctx.Configuration)
    .Enrich.FromLogContext()
    .WriteTo.Console());

// ---- Database ----------------------------------------------------------------
builder.Services.AddDbContext<AppDbContext>(o => o
    .UseNpgsql(builder.Configuration.GetConnectionString("DefaultConnection")
        ?? throw new InvalidOperationException("ConnectionStrings:DefaultConnection is not configured."))
    .UseSnakeCaseNamingConvention());
builder.Services.AddScoped<DbSeeder>();

// ---- Authentication: JWT carried in an HTTP-only cookie --------------------------
builder.Services.AddOptions<JwtOptions>().BindConfiguration(JwtOptions.Section).ValidateDataAnnotations().ValidateOnStart();
builder.Services.AddOptions<AuthCookieOptions>().BindConfiguration(AuthCookieOptions.Section);

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme).AddJwtBearer();
builder.Services.AddOptions<JwtBearerOptions>(JwtBearerDefaults.AuthenticationScheme)
    .Configure<IOptions<JwtOptions>, IOptions<AuthCookieOptions>>((o, jwt, cookie) =>
    {
        o.MapInboundClaims = false;
        o.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidIssuer = jwt.Value.Issuer,
            ValidateAudience = true,
            ValidAudience = jwt.Value.Audience,
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = TokenService.GetSigningKey(jwt.Value),
            ValidateLifetime = true,
            ClockSkew = TimeSpan.FromSeconds(30),
            RoleClaimType = System.Security.Claims.ClaimTypes.Role,
            NameClaimType = JwtRegisteredClaimNames.Name,
        };
        o.Events = new JwtBearerEvents
        {
            OnMessageReceived = ctx =>
            {
                ctx.Token = ctx.Request.Cookies[cookie.Value.Name];
                return Task.CompletedTask;
            },
            // A deactivated user loses access on their next request, not when the token expires.
            OnTokenValidated = async ctx =>
            {
                var db = ctx.HttpContext.RequestServices.GetRequiredService<AppDbContext>();
                // No cancellation token: an aborted request must not be mistaken for a failed check.
                var active = int.TryParse(ctx.Principal?.FindFirst(JwtRegisteredClaimNames.Sub)?.Value, out var id)
                    && await db.Users.AnyAsync(u => u.Id == id && u.IsActive);
                if (!active) ctx.Fail("User is inactive or no longer exists.");
            },
            OnChallenge = async ctx =>
            {
                ctx.HandleResponse();
                ctx.Response.StatusCode = StatusCodes.Status401Unauthorized;
                await ctx.Response.WriteAsJsonAsync(ApiResponse.Fail("Your session has expired. Please sign in again."));
            },
            OnForbidden = async ctx =>
            {
                ctx.Response.StatusCode = StatusCodes.Status403Forbidden;
                await ctx.Response.WriteAsJsonAsync(ApiResponse.Fail("You do not have permission to do that."));
            },
        };
    });

builder.Services.AddSingleton<IAuthorizationPolicyProvider, PermissionPolicyProvider>();
builder.Services.AddSingleton<IAuthorizationHandler, PermissionHandler>();
builder.Services.AddAuthorization(o =>
{
    // Every endpoint requires a signed-in user unless it opts out with [AllowAnonymous].
    o.FallbackPolicy = new AuthorizationPolicyBuilder().RequireAuthenticatedUser().Build();
});

// ---- Rate limiting ------------------------------------------------------------
builder.Services.AddRateLimiter(o =>
{
    o.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
    o.OnRejected = async (ctx, ct) =>
        await ctx.HttpContext.Response.WriteAsJsonAsync(
            ApiResponse.Fail("Too many attempts. Please wait a minute and try again."), ct);

    // Login attempts per IP per minute (RateLimiting:LoginPerMinute, default 10).
    var loginPermits = builder.Configuration.GetValue("RateLimiting:LoginPerMinute", 10);
    o.AddPolicy(RateLimitPolicies.Login, http => RateLimitPartition.GetFixedWindowLimiter(
        http.Connection.RemoteIpAddress?.ToString() ?? "unknown",
        _ => new FixedWindowRateLimiterOptions { PermitLimit = loginPermits, Window = TimeSpan.FromMinutes(1) }));
});

// ---- Application services ------------------------------------------------------
builder.Services.AddSingleton<TokenService>();
builder.Services.AddScoped<AuditService>();
builder.Services.AddScoped<AuthService>();
builder.Services.AddScoped(typeof(LookupService<>));
builder.Services.AddScoped<UserService>();
builder.Services.AddScoped<CustomFieldService>();
builder.Services.AddScoped<CaptureConfigService>();
builder.Services.AddScoped<SettingsService>();
builder.Services.AddSingleton<ContactNormalizer>();
builder.Services.AddScoped<ClinicClock>();
builder.Services.AddScoped<CustomerService>();
builder.Services.AddValidatorsFromAssemblyContaining<LoginRequestValidator>();

builder.Services.AddControllers(o => o.Filters.Add<ValidationFilter>())
    .ConfigureApiBehaviorOptions(o =>
    {
        // Malformed JSON and model-binding errors use the same envelope as validation errors.
        o.InvalidModelStateResponseFactory = ctx => new BadRequestObjectResult(ApiResponse.Fail(
            "The request could not be read.",
            ctx.ModelState.Where(kv => kv.Value?.Errors.Count > 0)
                .SelectMany(kv => kv.Value!.Errors.Select(e => new ApiError(kv.Key, "Invalid value.")))
                .ToList()));
    });

builder.Services.AddOpenApi();

builder.Services.Configure<ForwardedHeadersOptions>(o =>
{
    // The API sits behind the Next.js server (and Caddy in production); trust their X-Forwarded-For.
    o.ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto;
    o.KnownIPNetworks.Clear();
    o.KnownProxies.Clear();
});

var app = builder.Build();

// ---- Database migration + seed on start-up ----------------------------------------
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    await db.Database.MigrateAsync();
    await scope.ServiceProvider.GetRequiredService<DbSeeder>().SeedAsync();
}

app.UseForwardedHeaders();
// Request logging wraps the exception middleware so it records the final status code,
// not the raw exception (client-cancelled requests are not errors).
app.UseSerilogRequestLogging();
app.UseMiddleware<ExceptionMiddleware>();

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi().AllowAnonymous();
    app.UseSwaggerUI(o => o.SwaggerEndpoint("/openapi/v1.json", "GrowDesk API v1"));
}

app.UseRateLimiter();
app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

app.Run();

/// <summary>Exposed for WebApplicationFactory in integration tests.</summary>
public partial class Program;
