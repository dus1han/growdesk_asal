using System.Text.Json;
using DoctorCrm.Api.Authorization;
using DoctorCrm.Api.Data;
using DoctorCrm.Api.DTOs;
using DoctorCrm.Api.Services;
using Microsoft.AspNetCore.Http.Features;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace DoctorCrm.Api.Controllers;

/// <summary>
/// Live updates for open GrowDesk screens as Server-Sent Events: one long-lived response per tab
/// that the server writes an event to the moment the WhatsApp BOT books or moves a consultation.
/// It runs over plain HTTP through the Next.js server, signed in with the normal session cookie.
/// </summary>
[ApiController]
[Route("api/live")]
[HasPermission(Permissions.BookingsView)]
public class LiveController(LiveEvents live, AppDbContext db, IHostApplicationLifetime lifetime) : ControllerBase
{
    /// <summary>Comment lines keep proxies from closing an idle connection.</summary>
    private static readonly TimeSpan Heartbeat = TimeSpan.FromSeconds(25);

    /// <summary>How far back a reconnecting screen catches up.</summary>
    private static readonly TimeSpan CatchUpWindow = TimeSpan.FromHours(12);

    [HttpGet("stream")]
    [ApiExplorerSettings(IgnoreApi = true)]
    public async Task Stream(CancellationToken requestAborted)
    {
        Response.ContentType = "text/event-stream";
        // no-transform stops compression (Next.js, Caddy) from buffering the stream.
        Response.Headers.CacheControl = "no-cache, no-transform";
        Response.Headers["X-Accel-Buffering"] = "no";
        HttpContext.Features.Get<IHttpResponseBodyFeature>()?.DisableBuffering();

        using var stop = CancellationTokenSource.CreateLinkedTokenSource(requestAborted, lifetime.ApplicationStopping);
        var ct = stop.Token;

        var (id, reader) = live.Subscribe();
        try
        {
            await WriteAsync("retry: 5000\n\n", ct);

            // A reconnecting browser sends the last event ID it saw: send what it missed meanwhile.
            var lastId = 0;
            if (int.TryParse(Request.Headers["Last-Event-ID"].FirstOrDefault() ?? Request.Query["lastEventId"].FirstOrDefault(), out var since))
            {
                var after = DateTime.UtcNow - CatchUpWindow;
                var missed = await BotService.LiveEventsAsync(db.Bookings.AsNoTracking()
                    .Where(b => b.Id > since && b.Source == BotService.SourceName && b.CreatedAt > after).Take(20), ct);
                foreach (var e in missed) await SendAsync(e, ct);
                lastId = missed.Count > 0 ? missed[^1].BookingId : since;
            }

            while (!ct.IsCancellationRequested)
            {
                using var wait = CancellationTokenSource.CreateLinkedTokenSource(ct);
                wait.CancelAfter(Heartbeat);
                try
                {
                    var e = await reader.ReadAsync(wait.Token);
                    // Already sent during the catch-up.
                    if (CarriesId(e) && e.BookingId <= lastId) continue;
                    await SendAsync(e, ct);
                }
                catch (OperationCanceledException) when (!ct.IsCancellationRequested)
                {
                    await WriteAsync(": ping\n\n", ct);
                }
            }
        }
        catch (OperationCanceledException)
        {
            // The tab closed or the server is stopping.
        }
        finally
        {
            live.Unsubscribe(id);
        }
    }

    /// <summary>Only new bookings carry an ID (it is what a reconnect resumes from); changes to older ones don't.</summary>
    private static bool CarriesId(LiveBookingEventDto e) => e.Type is "booking.created" or "booking.rescheduled";

    private async Task SendAsync(LiveBookingEventDto e, CancellationToken ct)
    {
        var idLine = CarriesId(e) ? $"id: {e.BookingId}\n" : "";
        await WriteAsync($"{idLine}event: {e.Type}\ndata: {JsonSerializer.Serialize(e, JsonSerializerOptions.Web)}\n\n", ct);
    }

    private async Task WriteAsync(string text, CancellationToken ct)
    {
        await Response.WriteAsync(text, ct);
        await Response.Body.FlushAsync(ct);
    }
}
