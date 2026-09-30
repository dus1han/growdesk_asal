using DoctorCrm.Api.DTOs;
using DoctorCrm.Api.Services;

namespace DoctorCrm.Api.Middleware;

/// <summary>
/// Last line of defence: logs the full exception and returns a friendly message. Stack traces,
/// SQL errors and exception names never reach the client (spec §47).
/// </summary>
public class ExceptionMiddleware(RequestDelegate next, ILogger<ExceptionMiddleware> logger)
{
    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            await next(context);
        }
        catch (OperationCanceledException) when (context.RequestAborted.IsCancellationRequested)
        {
            // The client went away (e.g. navigated before the response). Not an error.
            if (!context.Response.HasStarted) context.Response.StatusCode = 499;
        }
        catch (BusinessRuleException ex) when (!context.Response.HasStarted)
        {
            // Expected outcome of a rule check: the message is meant for the user.
            context.Response.StatusCode = ex.StatusCode;
            var errors = ex.Field is null ? null : new List<ApiError> { new(ex.Field, ex.Message) };
            await context.Response.WriteAsJsonAsync(ApiResponse.Fail(ex.Message, errors));
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Unhandled exception for {Method} {Path} (trace {TraceId})",
                context.Request.Method, context.Request.Path, context.TraceIdentifier);

            if (context.Response.HasStarted) throw;

            context.Response.Clear();
            context.Response.StatusCode = StatusCodes.Status500InternalServerError;
            await context.Response.WriteAsJsonAsync(ApiResponse.Fail("Something went wrong. Please try again."));
        }
    }
}
