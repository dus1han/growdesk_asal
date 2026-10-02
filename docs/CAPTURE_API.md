# GrowDesk Capture API

**Written for: whoever builds or maintains the CRM Capture toolbar (or any other capture tool).**

The capture tool never touches the database. It talks to these endpoints over HTTPS, and the
CRM decides everything: which fields are required, how numbers are normalised, and whether a lead
is a new customer or an existing one.

All responses use the CRM's standard envelope:

```json
{ "success": true, "data": { }, "message": null }
```

Errors: `{ "success": false, "data": null, "message": "Readable message", "errors": [{ "field": "whatsapp", "message": "…" }] }`.

## 1. Get a connection

An admin creates one under **Administration → Capture Tool → Connections**, one per PC. It
shows the **client ID** (`gdc_…`) and **client secret** (`gds_…`) once. Revoking it stops that
PC on its next request.

## 2. Exchange it for a token

```http
POST /api/capture/token
Content-Type: application/json

{ "clientId": "gdc_4f9a…", "clientSecret": "gds_81c2…" }
```

```json
{
  "success": true,
  "data": { "accessToken": "eyJhbGciOi…", "tokenType": "Bearer", "expiresIn": 900 },
  "message": null
}
```

The token lasts 15 minutes. Send it on every other call as `Authorization: Bearer <accessToken>`.
When a call answers **401**, request a new token and retry once. If the new token is refused
too, the connection was revoked.

Wrong ID, wrong secret and revoked connections all answer `401` with the same message.
Token requests are limited per IP (10 a minute by default); other calls to 120 a minute.

## 3. Read the configuration

```http
GET /api/capture/config
Authorization: Bearer eyJhbGciOi…
```

```json
{
  "success": true,
  "data": {
    "fields": [
      { "key": "name", "label": "Name", "type": "text", "enabled": true, "required": true, "order": 1, "isCustom": false, "options": null },
      { "key": "whatsapp", "label": "WhatsApp Number", "type": "phone", "enabled": true, "required": true, "order": 2, "isCustom": false, "options": null },
      { "key": "treatments", "label": "Interested Treatments", "type": "multiselect", "enabled": true, "required": false, "order": 5, "isCustom": false, "options": null },
      { "key": "preferred_clinic", "label": "Preferred Clinic", "type": "dropdown", "enabled": true, "required": false, "order": 10, "isCustom": true,
        "options": [{ "id": 4, "label": "Downtown" }, { "id": 5, "label": "Marina" }] }
    ]
  }
}
```

Show the enabled fields in `order`. STOP should only be possible once every `required` field
has a value.

Lists for the built-in choice fields:

| Endpoint | Returns | Used by field |
| --- | --- | --- |
| `GET /api/capture/treatments` | `[{ "id": 1, "name": "Botox", "color": null }]` | `treatments` |
| `GET /api/capture/stages` | `[{ "id": 1, "name": "Interested", "color": "#6366F1" }]` (the customer statuses) | `stage` (shown as Status) |
| `GET /api/capture/sources` | `[{ "id": 2, "name": "Instagram", "color": null }]` | `lead_source` |
| `GET /api/capture/custom-fields` | `[{ "key": "preferred_clinic", "label": "Preferred Clinic", "type": "dropdown", "options": [...] }]` | custom fields |

## 4. Send a lead

```http
POST /api/capture/customers
Authorization: Bearer eyJhbGciOi…
Content-Type: application/json

{
  "name": "Sarah Fernando",
  "whatsApp": "+971 50 123 4567",
  "secondaryPhone": null,
  "instagram": "@sarah.fernando",
  "email": null,
  "stageId": null,
  "leadSourceId": 2,
  "treatmentIds": [1, 2],
  "customFields": { "preferred_clinic": 5 },
  "notes": "Asked about pricing"
}
```

New customer:

```json
{
  "success": true,
  "data": { "customerId": 1053, "action": "created", "customerName": "Sarah Fernando", "warnings": [] },
  "message": "Sarah Fernando was added."
}
```

Existing customer:

```json
{
  "success": true,
  "data": {
    "customerId": 1052,
    "action": "updated",
    "customerName": "Sarah Fernando",
    "warnings": ["Instagram @sarah.f belongs to Sarah Perera, so it was not added."]
  },
  "message": "Sarah Fernando was updated."
}
```

Show `message` to the user, and any `warnings` underneath it.

### What the CRM does with it

1. **Only enabled fields are used.** Values for fields the admin switched off are ignored, not rejected.
2. **Required fields are checked.** A missing one answers `400` with, for example,
   `"Required: WhatsApp Number."` and `errors[0].field` set to the field key.
3. **Contact details are normalised.** Numbers from any country with their code (`+94…`, `0094…`);
   UAE numbers also work without it (`050…`). Instagram accepts `@name`, `name` or a profile URL.
   At least a WhatsApp number or an Instagram name is needed to identify the customer.
4. **The customer is found by WhatsApp number, then Instagram name.** The same number in a
   different format is the same customer.
5. **New customers** start with the status sent, or **Interested**.
6. **Existing customers are only added to**, never cleared:
   - Treatments are added to their interests.
   - Notes are appended.
   - A new Instagram name is added unless it belongs to someone else (a warning says so).
   - A different WhatsApp number never replaces the one on record. It becomes the secondary
     number if that is free, with a warning.
   - A status sent is applied as chosen: the status is the clinic's own judgement, set by people.
7. **Last contact** is set to today, and the customer's activity shows *Captured on <connection name>*.

### Field reference

| Key | Request property | Type |
| --- | --- | --- |
| `name` | `name` | text (≤150) |
| `whatsapp` | `whatsApp` | phone |
| `secondary_phone` | `secondaryPhone` | phone |
| `instagram` | `instagram` | text |
| `email` | `email` | email |
| `treatments` | `treatmentIds` | array of treatment ids |
| `stage` | `stageId` | status id (from `GET /api/capture/stages`) |
| `lead_source` | `leadSourceId` | lead source id |
| `notes` | `notes` | text (≤4000) |
| custom field | `customFields["<key>"]` | text / number / `yyyy-MM-dd` / option id / array of option ids / boolean, by type |

### Errors

| Status | When |
| --- | --- |
| 400 | A required field is missing or a value is invalid. `errors[0].field` names it. |
| 401 | Missing, expired or revoked token. Get a new token; if that fails, the connection was revoked. |
| 409 | The same new customer was saved from another PC at the same moment. Send it again. |
| 429 | Too many requests. Wait a minute. |
