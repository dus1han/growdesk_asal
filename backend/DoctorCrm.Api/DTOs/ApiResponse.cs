namespace DoctorCrm.Api.DTOs;

/// <summary>The one response envelope every endpoint returns (spec §37).</summary>
public record ApiResponse<T>(bool Success, T? Data, string? Message, IReadOnlyList<ApiError>? Errors = null)
{
    public static ApiResponse<T> Ok(T data, string? message = null) => new(true, data, message);
}

public record ApiError(string? Field, string Message);

public static class ApiResponse
{
    public static ApiResponse<object> Fail(string message, IReadOnlyList<ApiError>? errors = null) =>
        new(false, null, message, errors ?? []);

    public static ApiResponse<object> Ok(string? message = null) => new(true, null, message);
}
