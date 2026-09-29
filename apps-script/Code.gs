/**
 * CRM Capture - Google Sheet receiver.
 *
 * Paste this into the Apps Script attached to your sheet
 * (Extensions -> Apps Script), set SHARED_SECRET below, then:
 *   Deploy -> New deployment -> Web app
 *     Execute as:      Me
 *     Who has access:  Anyone
 * Copy the resulting /exec URL into the extension's options page.
 *
 * SECURITY NOTE: "Anyone" means anyone who knows the URL can call this.
 * SHARED_SECRET is what stops a leaked URL from being writable. Change it to
 * a long random string, and treat the URL + secret as a write credential.
 */

// ---------------------------------------------------------------------------
// CHANGE THIS to a long random string, then paste the same value into the
// extension's options page.
var SHARED_SECRET = 'CHANGE_ME_TO_A_LONG_RANDOM_STRING';

// Tab the leads are appended to. Created automatically if missing.
var SHEET_NAME = 'Leads';
// ---------------------------------------------------------------------------

var HEADERS = ['Captured At', 'Name', 'Number', 'Instagram Name', 'Source', 'Device'];
var DATE_FORMAT = 'yyyy-mm-dd hh:mm:ss';

function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      return reply({ ok: false, error: 'Empty request.' });
    }

    var body = JSON.parse(e.postData.contents);

    if (!SHARED_SECRET || SHARED_SECRET === 'CHANGE_ME_TO_A_LONG_RANDOM_STRING') {
      return reply({ ok: false, error: 'SHARED_SECRET has not been set in the Apps Script.' });
    }
    if (body.secret !== SHARED_SECRET) {
      return reply({ ok: false, error: 'Shared secret does not match.' });
    }

    // The options page "Test connection" button verifies setup without
    // appending a row.
    if (body.test === true) {
      getSheet();
      return reply({ ok: true, mode: 'test' });
    }

    var lead = body.lead;
    if (!lead) return reply({ ok: false, error: 'No lead in the request.' });

    // Mirrors the extension's own rule: a lead needs a contact identifier.
    var hasNumber = !!(lead.number && String(lead.number).trim());
    var hasInstagram = !!(lead.instagramName && String(lead.instagramName).trim());
    if (!hasNumber && !hasInstagram) {
      return reply({ ok: false, error: 'Lead has neither a Number nor an Instagram Name.' });
    }

    var sheet = getSheet();
    var capturedAt = lead.capturedAtIso ? new Date(lead.capturedAtIso) : new Date();
    if (isNaN(capturedAt.getTime())) capturedAt = new Date();

    sheet.appendRow([
      capturedAt,
      lead.name || '',
      lead.number || '',
      lead.instagramName || '',
      lead.source || '',
      lead.device || '',
    ]);

    // Write the timestamp as a real date value, formatted for readability.
    sheet.getRange(sheet.getLastRow(), 1).setNumberFormat(DATE_FORMAT);

    return reply({ ok: true, row: sheet.getLastRow() });
  } catch (err) {
    return reply({ ok: false, error: String(err) });
  }
}

/** Browsing to the /exec URL shows this instead of an error. */
function doGet() {
  return reply({ ok: true, service: 'CRM Capture', note: 'POST leads to this URL.' });
}

function getSheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) sheet = ss.insertSheet(SHEET_NAME);

  if (sheet.getLastRow() === 0) {
    sheet.appendRow(HEADERS);
    sheet.getRange(1, 1, 1, HEADERS.length).setFontWeight('bold');
    sheet.setFrozenRows(1);
    sheet.setColumnWidth(1, 160);
  }
  return sheet;
}

function reply(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(
    ContentService.MimeType.JSON,
  );
}
