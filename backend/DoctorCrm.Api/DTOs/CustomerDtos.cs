using System.Text.Json;

namespace DoctorCrm.Api.DTOs;

public record PagedResult<T>(IReadOnlyList<T> Items, int Page, int PageSize, int TotalCount);

public record NamedRef(int Id, string Name);

public record StageRef(int Id, string Name, string Color, string? SystemKey);

/// <summary>Query string for GET /api/customers. Every filter is optional and they combine (AND).</summary>
public class CustomerQuery
{
    public string? Search { get; set; }
    public int? StageId { get; set; }
    public int? TreatmentId { get; set; }
    public int? LeadSourceId { get; set; }
    public int? AssignedUserId { get; set; }
    public DateOnly? CreatedFrom { get; set; }
    public DateOnly? CreatedTo { get; set; }
    public DateOnly? FollowUpFrom { get; set; }
    public DateOnly? FollowUpTo { get; set; }
    public int Page { get; set; } = 1;
    public int PageSize { get; set; } = 20;
}

public record CustomerListItemDto(
    int Id,
    string Name,
    string? WhatsApp,
    string? Instagram,
    StageRef Stage,
    IReadOnlyList<NamedRef> Treatments,
    string? LeadSource,
    string? AssignedUser,
    DateOnly? NextFollowUpDate,
    DateTime CreatedAt);

/// <summary>
/// A custom field value, typed by field: string (text, long text, phone, email, date as yyyy-MM-dd),
/// number, boolean, option id (dropdown) or array of option ids (multi-select).
/// </summary>
public record CustomFieldValueDto(int FieldId, string Key, string Label, string FieldType, JsonElement Value, string Display);

public record CustomerDetailDto(
    int Id,
    string Name,
    string? WhatsApp,
    string? SecondaryPhone,
    string? Instagram,
    string? Email,
    StageRef Stage,
    NamedRef? LeadSource,
    NamedRef? AssignedUser,
    DateOnly? LastContactDate,
    DateOnly? NextFollowUpDate,
    string? Notes,
    bool IsActive,
    IReadOnlyList<NamedRef> Treatments,
    IReadOnlyList<CustomFieldValueDto> CustomFields,
    DateTime CreatedAt,
    DateTime UpdatedAt);

public record SaveCustomerRequest(
    string Name,
    string? WhatsApp,
    string? SecondaryPhone,
    string? Instagram,
    string? Email,
    int? StageId,
    int? LeadSourceId,
    int? AssignedUserId,
    IReadOnlyList<int>? TreatmentIds,
    DateOnly? LastContactDate,
    DateOnly? NextFollowUpDate,
    string? Notes,
    /// <summary>Keyed by custom field key. Missing or null clears the value.</summary>
    Dictionary<string, JsonElement>? CustomFields);

public record ActivityDto(long Id, string Action, string? UserName, DateTime CreatedAt, JsonElement? Details);

/// <summary>Returned with a 409 when a WhatsApp number or Instagram name already belongs to a customer.</summary>
public record DuplicateCustomerDto(int ExistingCustomerId, string ExistingCustomerName, string MatchedOn);
