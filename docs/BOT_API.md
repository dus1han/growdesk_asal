# GrowDesk WhatsApp BOT API

This guide is for the developer connecting a WhatsApp chatbot to GrowDesk. With this API the bot can:

- list the treatments a customer can choose;
- find free consultation times on a day;
- save an interested customer;
- book a consultation (and create the customer at the same time);
- look up, move or change a customer's booking.

GrowDesk applies all the clinic's rules. The bot only sends what the customer chose, and GrowDesk:

- finds or creates the customer by WhatsApp number;
- works out the end time;
- keeps bookings inside opening hours and away from other bookings and blocked time;
- moves the customer's stage.

Each booking appears on the clinic's GrowDesk screens the moment it is made.

## 1. Before you start

The clinic's GrowDesk admin gives you three things. They come from **Administration → WhatsApp BOT → Connections → Add connection**:

| Item | Example |
|---|---|
| API address | `http://169.58.92.105:3110/api/bot` |
| Client ID | `gdc_8f3c…` |
| Client secret | `gds_41ab…` (shown to the admin only once) |

Keep the client secret on your server. Never put it in a WhatsApp message, a web page or a mobile app. If it leaks, the admin revokes the connection and gives you a new one.

> **HTTPS:** the address above is plain HTTP for now, so the secret and customer details travel unencrypted. When GrowDesk moves to a domain with HTTPS, only the address changes, to `https://<domain>/api/bot`. Nothing else in this guide changes.

## 2. Conventions

- **Format:** send and receive JSON, with the header `Content-Type: application/json`.
- **Dates:** `yyyy-MM-dd`, e.g. `2026-10-05`.
- **Times:** 24-hour `HH:mm`, e.g. `16:00`.
- **Time zone:** dates and times are always the clinic's local time (Asia/Dubai).
- **WhatsApp numbers:** send them with the country code, e.g. `+971501234567`. Spaces, dashes and a leading `00` are fine. GrowDesk normalises the number, so `+971 50 123 4567` and `00971501234567` are the same customer.
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
| 404 | Booking not found for this WhatsApp number | Check the booking ID and number |
| 409 | The time is taken or blocked, or the booking can no longer be changed | Offer the free times in `data.freeTimes` (section 6) |
| 429 | Too many requests | Wait a minute and retry |
| 500 | Something went wrong in GrowDesk | Retry later; tell the customer the clinic will confirm |

## 3. Signing in: `POST /token`

Exchange the client ID and secret for an access token, then send that token with every other call.

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

The token lasts **15 minutes** (`expiresIn` is in seconds). Keep one token and reuse it. Get a new one shortly before it expires, or when a call answers **401**. Don't request a token for every message: token requests are limited to 10 per minute.

A wrong ID or secret, or a revoked connection, answers **401**.

## 4. Treatments: `GET /treatments`

Lists the treatments the customer can choose, in the clinic's order. Use the `id` values in the other calls. The list can change when the clinic edits it, so fetch it at least daily rather than hard-coding it.

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

## 5. Free times: `GET /availability?date=yyyy-MM-dd`

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

## 6. Book a consultation: `POST /bookings`

One call does everything: it creates the customer if the number is new, books the consultation and moves the customer's stage to **Booked**. The customer and the booking are saved together. If the booking can't be made, nothing is saved.

```http
POST /api/bot/bookings
Authorization: Bearer …
Content-Type: application/json

{
  "name": "Sarah Fernando",
  "whatsapp": "+971501234567",
  "treatmentIds": [1, 2],
  "date": "2026-10-05",
  "startTime": "16:00",
  "notes": "Asked about pricing for lips"
}
```

| Field | Required | Notes |
|---|---|---|
| `name` | Yes | Up to 150 characters. Used only when the customer is new; an existing customer keeps the name on record. |
| `whatsapp` | Yes | The customer's WhatsApp number, with country code. |
| `treatmentIds` | Yes | At least one ID from `GET /treatments`. |
| `date` | Yes | `yyyy-MM-dd`. |
| `startTime` | Yes | `HH:mm`. The end time is the start plus the clinic's booking length (45 minutes by default). |
| `notes` | No | Saved on the booking. Up to 2000 characters. |

```json
{
  "success": true,
  "data": {
    "action": "booked",
    "customerAction": "created",
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

Response fields:

- `customerAction`: `created` for a new number, `updated` for a customer GrowDesk already knew.
- `booking.bookingId`: store it if you want to change the booking later.

**When the time is taken or blocked (409):** GrowDesk returns the other free times that day, so the bot can offer them straight away:

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

## 7. Save an interested customer: `POST /customers`

Use this when the chat ends without a booking, so the clinic can follow up.

```http
POST /api/bot/customers
Authorization: Bearer …
Content-Type: application/json

{
  "name": "Sarah Fernando",
  "whatsapp": "+971501234567",
  "treatmentIds": [1],
  "notes": "Wants to book after payday"
}
```

| Field | Required | Notes |
|---|---|---|
| `name` | Yes | Used only when the customer is new. |
| `whatsapp` | Yes | With country code. |
| `treatmentIds` | Yes | At least one. Added to the customer's interests, never removed. |
| `notes` | No | Added to the customer's notes. |

```json
{
  "success": true,
  "data": { "customerId": 1052, "action": "created", "customerName": "Sarah Fernando", "stage": "Interested" },
  "message": "Sarah Fernando was added."
}
```

What GrowDesk does:

- **New number:** creates the customer at stage **Interested**, with lead source **WhatsApp BOT**.
- **Known number:** returns `action: "updated"` with the same `customerId`, so there is never a duplicate. The customer's name, stage and source don't change.
- **Booking later:** if the customer books afterwards with the same number, `POST /bookings` finds them and moves them to **Booked**.

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

- **Move it:** send `date` **and** `startTime` together. The end time is worked out again. The same rules as booking apply: opening hours, clashes, blocked time, not in the past.
- **Change treatments:** send `treatmentIds`. They replace the booking's treatments.
- **Change the note:** send `notes`. They replace the booking's note; send `""` to clear it.

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
    "customerAction": null,
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

Cancelling is not available to the bot. The clinic cancels bookings in GrowDesk.

## 10. A typical conversation

1. The customer asks for a treatment. Match it to `GET /treatments`.
2. The customer suggests a day. Call `GET /availability?date=…` and offer a few `freeTimes`.
3. The customer picks a time. Call `POST /bookings`.
   - **200:** confirm `date`, `startTime`–`endTime` and the treatments.
   - **409:** someone took the time in the meantime. Offer `data.freeTimes`.
   - **400:** reword `message` and ask again.
4. If the customer leaves without booking, call `POST /customers` so the clinic can follow up.
5. Later, if the customer wants to change the appointment:
   - call `GET /bookings?whatsapp=…` to find it;
   - call `PATCH /bookings/{bookingId}` to change it;
   - keep the new `bookingId` from the reply.

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
curl -s "$API/availability?date=2026-10-05" -H "Authorization: Bearer $TOKEN"

curl -s -X POST $API/bookings -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"name":"Test Customer","whatsapp":"+971500000000","treatmentIds":[1],"date":"2026-10-05","startTime":"16:00"}'
```

These calls create real customers and bookings in GrowDesk. Ask the clinic to cancel any test bookings.
