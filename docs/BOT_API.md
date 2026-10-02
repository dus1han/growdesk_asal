# WhatsApp BOT API

This guide is for the developer connecting a WhatsApp chatbot to the clinic's CRM through the WhatsApp BOT API. The bot can:

- save every new contact as an interested customer;
- list the treatments a customer can choose;
- find free consultation times on a day;
- book a consultation;
- look up, move or change a customer's booking.

The bot only sends what the customer said or chose. The WhatsApp BOT API applies all the clinic's rules:

- it finds the customer by WhatsApp number, so there are no duplicates;
- it works out each booking's end time;
- it keeps bookings inside opening hours and away from other bookings and blocked time.

Each new booking appears on the clinic's screens the moment it is made.

## 1. Before you start

The clinic's admin gives you three values. They come from **Administration → WhatsApp BOT → Connections → Add connection** in the CRM:

| Value | Example |
|---|---|
| API address | `http://169.58.92.105:3110/api/bot` |
| Client ID | `gdc_8f3c…` |
| Client secret | `gds_41ab…` (shown to the admin only once) |

Keep the client secret on your server. Never put it in a WhatsApp message, a web page or a mobile app. If it leaks, the admin revokes the connection and issues a new one.

> **HTTPS:** the address above is plain HTTP for now, so the secret and customer details travel unencrypted. When the CRM moves to a domain with HTTPS, only the address changes, to `https://<domain>/api/bot`. Nothing else in this guide changes.

## 2. Conventions

- **Format:** send and receive JSON, with the header `Content-Type: application/json`.
- **Dates:** `yyyy-MM-dd`, e.g. `2026-10-05`.
- **Times:** 24-hour `HH:mm`, e.g. `16:00`.
- **Time zone:** dates and times are always the clinic's local time (Asia/Dubai).
- **WhatsApp numbers:** send them with the country code, e.g. `+971501234567`. Spaces, dashes and a leading `00` are fine. The API normalises the number, so `+971 50 123 4567` and `00971501234567` are the same customer.
- **IDs:** whole numbers.

Every response has the same envelope:

```json
{ "success": true, "data": { … }, "message": "Short text for people", "errors": null }
```

An error looks like this:

```json
{
  "success": false,
  "data": null,
  "message": "Send the date as yyyy-MM-dd, e.g. 2026-10-05.",
  "errors": [{ "field": "date", "message": "Send the date as yyyy-MM-dd, e.g. 2026-10-05." }]
}
```

The `message` is written for people, so the bot can pass it on or reword it. `errors[].field` names the field that was wrong.

| HTTP status | Meaning | What the bot should do |
|---|---|---|
| 200 | Done | Use `data` |
| 400 | Something sent is missing or invalid (bad date, closed day, past time, unknown treatment…) | Read `message` and ask the customer again |
| 401 | No token, or it expired or was revoked | Get a new token (section 3) and retry once |
| 403 | This connection isn't a bot connection | Ask the admin for a **WhatsApp BOT** connection |
| 404 | Customer not saved yet (booking), or booking not found for this WhatsApp number | Save the customer first (section 4), or check the booking ID and number |
| 409 | The time is taken or blocked, or the booking can no longer be changed | Offer the free times in `data.freeTimes` (section 7) |
| 429 | Too many requests | Wait a minute and retry |
| 500 | Something went wrong on the server | Retry later; tell the customer the clinic will confirm |

## 3. Signing in: `POST /token`

Exchange the client ID and secret for an access token:

```http
POST /api/bot/token
Content-Type: application/json

{ "clientId": "gdc_8f3c…", "clientSecret": "gds_41ab…" }
```

```json
{
  "success": true,
  "data": { "accessToken": "eyJhbGciOi…", "tokenType": "Bearer", "expiresIn": 900 }
}
```

Send the token in the `Authorization` header on every other call:

```http
Authorization: Bearer eyJhbGciOi…
```

- **Lifetime:** 15 minutes (`expiresIn` is in seconds).
- **Reuse:** keep one token and reuse it. Get a new one shortly before it expires, or when a call answers **401**.
- **Limit:** don't request a token for every message; token requests are limited to 10 per minute.
- **Refused:** a wrong ID or secret, or a revoked connection, answers **401**.

## 4. Save the customer: `POST /customers`

Call this when a **new message arrives**, so every contact is saved as an interested customer straight away. This is the only call that creates customers. A booking (section 7) needs the customer saved first.

Calling it again for a known number is safe. It never creates a duplicate, so the bot can call it on every new conversation, or again when the customer mentions more treatments.

```http
POST /api/bot/customers
Authorization: Bearer …
Content-Type: application/json

{
  "name": "Sarah Fernando",
  "whatsapp": "+971501234567",
  "treatmentIds": [1],
  "notes": "Asked about pricing"
}
```

| Field | Required | Notes |
|---|---|---|
| `name` | Yes | Up to 150 characters, e.g. the WhatsApp profile name. Used only when the customer is new. |
| `whatsapp` | Yes | With country code. |
| `treatmentIds` | Yes | At least one ID from `GET /treatments`. Added to the customer's interests, never removed. |
| `notes` | No | Added to the customer's notes. Up to 2000 characters. |

```json
{
  "success": true,
  "data": { "customerId": 1052, "action": "created", "customerName": "Sarah Fernando" },
  "message": "Sarah Fernando was added."
}
```

What the API does:

- **New number:** creates the customer, with lead source **WhatsApp BOT**.
- **Known number:** returns `action: "updated"` with the same `customerId`. The customer's name and source don't change.

## 5. Treatments: `GET /treatments`

Lists the treatments a customer can choose, in the clinic's order. Use the `id` values in the other calls. The clinic edits this list, so fetch it at least daily instead of hard-coding it.

```http
GET /api/bot/treatments
Authorization: Bearer …
```

```json
{
  "success": true,
  "data": [
    { "id": 1, "name": "Botox", "description": null },
    { "id": 2, "name": "Dermal Filler", "description": "Lips, cheeks and jawline" },
    { "id": 4, "name": "Skin Treatment", "description": null }
  ]
}
```

## 6. Free times: `GET /availability?date=yyyy-MM-dd`

Returns the start times still free on a day for one consultation. The times:

- are offered every 15 minutes;
- fall inside opening hours;
- don't overlap other bookings or time the clinic has blocked;
- don't include times that have already passed today.

```http
GET /api/bot/availability?date=2026-10-05
Authorization: Bearer …
```

```json
{
  "success": true,
  "data": {
    "date": "2026-10-05",
    "open": true,
    "opensAt": "09:00",
    "closesAt": "18:00",
    "durationMinutes": 45,
    "freeTimes": ["09:00", "09:15", "09:30", "11:45", "12:00", "16:00", "16:15"]
  }
}
```

Reading the reply:

- `open: false`: the clinic is closed that day, and `freeTimes` is empty.
- `open: true` with an empty `freeTimes`: the day is fully booked or blocked. Suggest another day.
- `durationMinutes`: how long each bot booking lasts. The clinic sets this; it is 45 minutes by default.

Rules on the date:

- It can be today, up to **180 days** ahead.
- A past date answers **400**.

## 7. Book a consultation: `POST /bookings`

Books a consultation for a customer saved in section 4, found by WhatsApp number.

```http
POST /api/bot/bookings
Authorization: Bearer …
Content-Type: application/json

{
  "whatsapp": "+971501234567",
  "treatmentIds": [1, 2],
  "date": "2026-10-05",
  "startTime": "16:00",
  "notes": "Asked about pricing for lips"
}
```

| Field | Required | Notes |
|---|---|---|
| `whatsapp` | Yes | The customer's WhatsApp number, as saved with `POST /customers`. |
| `treatmentIds` | Yes | At least one ID from `GET /treatments`. They are also added to the customer's interests. |
| `date` | Yes | `yyyy-MM-dd`. |
| `startTime` | Yes | `HH:mm`. The end time is the start plus the clinic's booking length (45 minutes by default). |
| `notes` | No | Saved on the booking. Up to 2000 characters. |

```json
{
  "success": true,
  "data": {
    "action": "booked",
    "previousBookingId": null,
    "booking": {
      "bookingId": 873,
      "customerId": 1052,
      "customerName": "Sarah Fernando",
      "date": "2026-10-05",
      "startTime": "16:00",
      "endTime": "16:45",
      "treatments": [{ "id": 1, "name": "Botox" }, { "id": 2, "name": "Dermal Filler" }],
      "status": "Booked",
      "notes": "Asked about pricing for lips"
    }
  },
  "message": "Booked Sarah Fernando for 2026-10-05 16:00."
}
```

Store `booking.bookingId` if you want to change the booking later.

**Customer not saved yet (404):**

```json
{
  "success": false,
  "data": null,
  "message": "No customer has this WhatsApp number yet. Save them with POST /api/bot/customers first.",
  "errors": [{ "field": "whatsapp", "message": "No customer has this WhatsApp number yet. Save them with POST /api/bot/customers first." }]
}
```

Call `POST /customers`, then book again.

**When the time is taken or blocked (409):** the reply lists the other free times that day, so the bot can offer them straight away:

```json
{
  "success": false,
  "data": { "date": "2026-10-05", "requestedTime": "16:00", "freeTimes": ["15:00", "16:45", "17:00"] },
  "message": "16:00 on 2026-10-05 is not available. Choose another time.",
  "errors": [{ "field": "startTime", "message": "16:00 on 2026-10-05 is not available. Choose another time." }]
}
```

**Other refusals (400):**

- the clinic is closed that day;
- the start is before opening time, or the booking would end after closing time;
- the time or date has already passed;
- the date is more than 180 days ahead;
- a treatment ID is unknown or inactive;
- the WhatsApp number is invalid.

The `message` says which it was.

## 8. The customer's bookings: `GET /bookings?whatsapp=…`

Lists the customer's upcoming booked consultations, soonest first. Use it when a customer asks "when is my appointment?" or wants to change one. An unknown number returns an empty list.

URL-encode the number: `+` becomes `%2B`.

```http
GET /api/bot/bookings?whatsapp=%2B971501234567
Authorization: Bearer …
```

```json
{
  "success": true,
  "data": [
    {
      "bookingId": 873,
      "customerId": 1052,
      "customerName": "Sarah Fernando",
      "date": "2026-10-05",
      "startTime": "16:00",
      "endTime": "16:45",
      "treatments": [{ "id": 1, "name": "Botox" }],
      "status": "Booked",
      "notes": null
    }
  ]
}
```

## 9. Move or change a booking: `PATCH /bookings/{bookingId}`

Send the customer's `whatsapp` number, which must be the booking customer's number, plus only what changes:

- **Move it:** send `date` **and** `startTime` together. The end time is worked out again. The booking rules apply: opening hours, clashes, blocked time, not in the past.
- **Change treatments:** send `treatmentIds`. They replace the booking's treatments.
- **Change the note:** send `notes`. It replaces the booking's note; send `""` to clear it.

You can do all three in one call.

```http
PATCH /api/bot/bookings/873
Authorization: Bearer …
Content-Type: application/json

{ "whatsapp": "+971501234567", "date": "2026-10-06", "startTime": "10:30" }
```

```json
{
  "success": true,
  "data": {
    "action": "rescheduled",
    "previousBookingId": 873,
    "booking": {
      "bookingId": 874,
      "customerId": 1052,
      "customerName": "Sarah Fernando",
      "date": "2026-10-06",
      "startTime": "10:30",
      "endTime": "11:15",
      "treatments": [{ "id": 1, "name": "Botox" }],
      "status": "Booked",
      "notes": null
    }
  },
  "message": "Moved to 2026-10-06 10:30."
}
```

**Moving a booking creates a new one.** The clinic keeps its history, so the old booking is kept with status *Rescheduled* and a **new booking ID** is created. Use `booking.bookingId` from the reply for any later change, not the old ID.

Changing only treatments or notes keeps the same ID, with `action: "updated"`.

| Answer | When |
|---|---|
| 404 | The booking doesn't exist, or belongs to a different WhatsApp number |
| 409 | The new time is taken or blocked (with `freeTimes`), or the booking is no longer *Booked* (completed, cancelled, already moved) |
| 400 | Only one of `date`/`startTime` was sent, nothing to change was sent, or a value is invalid |

Cancelling is not available to the bot. The clinic cancels bookings in the CRM.

## 10. A typical conversation

1. **A new message arrives.** Call `POST /customers` with the contact's name and number, and the treatment they ask about once you know it. They are now an interested customer.
2. **The customer asks for a treatment.** Match it to `GET /treatments`. If it's a new interest, call `POST /customers` again to add it.
3. **The customer suggests a day.** Call `GET /availability?date=…` and offer a few `freeTimes`.
4. **The customer picks a time.** Call `POST /bookings`:
    - **200:** confirm the date, start–end time and treatments.
    - **409:** someone took the time in the meantime. Offer `data.freeTimes`.
    - **404:** the customer wasn't saved yet. Do step 1, then book again.
    - **400:** reword `message` and ask again.
5. **The customer wants to change the appointment later.**
    - Call `GET /bookings?whatsapp=…` to find it.
    - Call `PATCH /bookings/{bookingId}` to change it.
    - Keep the new `bookingId` from the reply.

## 11. Limits

- **Token requests:** 10 per minute.
- **Other calls:** 120 per minute from the same server.
- **Over the limit:** the API answers **429**. Wait a minute before retrying.

## 12. Quick test with curl

```bash
API=http://169.58.92.105:3110/api/bot

TOKEN=$(curl -s -X POST $API/token -H "Content-Type: application/json" \
  -d '{"clientId":"gdc_…","clientSecret":"gds_…"}' | jq -r .data.accessToken)

curl -s $API/treatments -H "Authorization: Bearer $TOKEN"

curl -s -X POST $API/customers -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"name":"Test Customer","whatsapp":"+971500000000","treatmentIds":[1]}'

curl -s "$API/availability?date=2026-10-05" -H "Authorization: Bearer $TOKEN"

curl -s -X POST $API/bookings -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"whatsapp":"+971500000000","treatmentIds":[1],"date":"2026-10-05","startTime":"16:00"}'
```

These calls create real customers and bookings in the clinic's CRM. Ask the clinic to cancel any test bookings.
