// ═══════════════════════════════════════════════════════════════════
//  ConstroBill Pro — Google Apps Script Backend
//  Created by Khammina · SCMV
//  Deploy as Web App: Execute as Me | Access: Anyone
// ═══════════════════════════════════════════════════════════════════
//
//  SETUP INSTRUCTIONS:
//  1. Open Google Sheets → Extensions → Apps Script
//  2. Paste this entire file into the editor
//  3. Run initSheets() once to create all required sheets
//  4. Deploy → New Deployment → Web App
//     - Execute as: Me
//     - Who has access: Anyone
//  5. Copy the Web App URL
//  6. Open construction-billing-app.html
//  7. Find: const GAS_URL = '';
//  8. Paste your URL: const GAS_URL = 'https://script.google.com/...';
//
// ═══════════════════════════════════════════════════════════════════

// ── CONFIG ──────────────────────────────────────────────────────────
const APP_NAME    = 'ConstroBill Pro — by Khammina SCMV';
const TOKEN_HOURS = 720;   // session token expiry: 30 days
const ADMIN_EMAIL = '';    // optional: admin alert email
const APP_URL     = 'https://khammina.github.io/constrobill-pro/'; // your live app URL

// A single Google Sheets cell holds a maximum of 50,000 characters.
// Saved data (which includes base64 logos / QR images) is split into
// chunks below that limit and reassembled on load.
const MAX_CELL  = 45000;
// Chunk values are prefixed so Sheets never interprets them as a formula
// (a chunk boundary can easily land on a leading '=', '+', '-' or '@').
const CHUNK_TAG = '~';

// ── SHEET NAMES ──────────────────────────────────────────────────────
const S_USERS    = 'Users';
const S_SESSIONS = 'Sessions';
const S_DATA     = 'UserData';
const S_RESETS   = 'PasswordResets';
const S_LOGS     = 'AuditLog';

// ── CORS HEADERS ─────────────────────────────────────────────────────
function setCORS(output) {
  return output
    .setMimeType(ContentService.MimeType.JSON);
}

// ── MAIN ENTRY POINT ──────────────────────────────────────────────────
function doPost(e) {
  try {
    // Google Apps Script receives body as text/plain for CORS compatibility
    const bodyText = e.postData.contents || e.postData.getDataAsString();
    const body = JSON.parse(bodyText);
    const action = body.action;
    logAction(action, body.email || body.token || '?');

    const handlers = {
      ping:          () => ({ok:true, service:'ConstroBill API', version:'2.0'}),
      register:      () => handleRegister(body),
      login:         () => handleLogin(body),
      googleLogin:   () => handleGoogleLogin(body),
      forgotPassword:() => handleForgot(body),
      resetPassword: () => handleResetPassword(body),
      validateToken: () => handleValidateToken(body),
      saveData:      () => handleSaveData(body),
      loadData:      () => handleLoadData(body),
      deleteAccount: () => handleDeleteAccount(body),
    };

    const handler = handlers[action];
    if (!handler) return respond({ok:false, error:'Unknown action: '+action});
    return respond(handler());

  } catch(err) {
    logAction('ERROR', err.message);
    return respond({ok:false, error:'Server error: '+err.message});
  }
}

// Handle OPTIONS preflight (CORS) — Google Apps Script sends doGet for OPTIONS
function doGet(e) {
  const action = e.parameter.action;
  if (action === 'googleOAuth') return handleGoogleOAuth(e);
  if (action === 'resetPassword') return handleResetPasswordPage(e);

  // Health check
  return ContentService
    .createTextOutput(JSON.stringify({ok:true, service:'ConstroBill API', version:'1.0'}))
    .setMimeType(ContentService.MimeType.JSON);
}

// ── RESPOND ───────────────────────────────────────────────────────────
function respond(data) {
  return setCORS(
    ContentService.createTextOutput(JSON.stringify(data))
  );
}

// ── INIT SHEETS ───────────────────────────────────────────────────────
function initSheets() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  function ensureSheet(name, headers) {
    let sheet = ss.getSheetByName(name);
    if (!sheet) {
      sheet = ss.insertSheet(name);
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
      sheet.setFrozenRows(1);
    }
    return sheet;
  }

  ensureSheet(S_USERS,    ['userId','firstName','lastName','email','company','passHash','createdAt','lastLogin','status']);
  ensureSheet(S_SESSIONS, ['token','userId','email','createdAt','expiresAt','ip','lastUsed']);
  ensureSheet(S_DATA,     ['userId','email','dataKey','dataValue','savedAt','sizeBytes']);
  ensureSheet(S_RESETS,   ['token','email','createdAt','expiresAt','used']);
  ensureSheet(S_LOGS,     ['timestamp','action','email','ip','detail']);

  notify('✅ ConstroBill sheets initialized successfully!');
}

// getUi() throws when the script runs from a trigger or the API rather than
// from the Sheets menu — fall back to the execution log.
function notify(msg) {
  try { SpreadsheetApp.getUi().alert(msg); }
  catch(e) { Logger.log(msg); }
}

// ── HELPERS ───────────────────────────────────────────────────────────
function getSheet(name) {
  const s = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(name);
  if (!s) throw new Error('Sheet not found: '+name+'. Run initSheets() first.');
  return s;
}

function getAllRows(sheetName) {
  const sheet = getSheet(sheetName);
  const data  = sheet.getDataRange().getValues();
  if (data.length < 2) return [];
  const headers = data[0];
  return data.slice(1).map(row => {
    const obj = {};
    headers.forEach((h, i) => obj[h] = row[i]);
    return obj;
  });
}

function appendRow(sheetName, obj) {
  const sheet   = getSheet(sheetName);
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const row     = headers.map(h => obj[h] !== undefined ? obj[h] : '');
  sheet.appendRow(row);
}

function updateRow(sheetName, matchField, matchValue, updates) {
  const sheet   = getSheet(sheetName);
  const data    = sheet.getDataRange().getValues();
  const headers = data[0];
  const colIdx  = headers.indexOf(matchField);
  if (colIdx === -1) return false;
  for (let i = 1; i < data.length; i++) {
    if (data[i][colIdx] === matchValue) {
      Object.keys(updates).forEach(key => {
        const ki = headers.indexOf(key);
        if (ki !== -1) sheet.getRange(i+1, ki+1).setValue(updates[key]);
      });
      return true;
    }
  }
  return false;
}

function deleteRow(sheetName, matchField, matchValue) {
  const sheet   = getSheet(sheetName);
  const data    = sheet.getDataRange().getValues();
  const headers = data[0];
  const colIdx  = headers.indexOf(matchField);
  if (colIdx === -1) return;
  for (let i = data.length - 1; i >= 1; i--) {
    if (data[i][colIdx] === matchValue) {
      sheet.deleteRow(i+1);
    }
  }
}

function generateToken() {
  return Utilities.getUuid().replace(/-/g,'') + Utilities.getUuid().replace(/-/g,'');
}

function hashPassword(pass) {
  const bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, pass);
  return bytes.map(b => ('0'+(b&0xFF).toString(16)).slice(-2)).join('');
}

function nowISO()   { return new Date().toISOString(); }
function addHours(h){ return new Date(Date.now() + h*3600000).toISOString(); }

// Only auth-level events are audited. saveData/loadData fire on every
// autosave — logging those made the AuditLog sheet grow without bound and
// added a full sheet write to the critical path of every single sync.
const AUDITED = ['register','login','googleLogin','forgotPassword',
                 'resetPassword','deleteAccount','ERROR'];

function logAction(action, detail) {
  if (AUDITED.indexOf(action) === -1) return;
  try {
    appendRow(S_LOGS, {
      timestamp: nowISO(),
      action,
      email: '',
      ip: '',
      detail: String(detail).slice(0, 200)
    });
  } catch(e) {}
}

// ── REGISTER ─────────────────────────────────────────────────────────
function handleRegister(body) {
  const {fname, lname, email, company, pass} = body;
  if (!fname||!email||!pass) return {ok:false, error:'Missing required fields'};

  const emailLower = email.toLowerCase().trim();
  const users = getAllRows(S_USERS);
  if (users.find(u => u.email === emailLower)) {
    return {ok:false, error:'An account with this email already exists'};
  }

  const passDecoded = Utilities.newBlob(
    Utilities.base64Decode(pass)
  ).getDataAsString();
  if (passDecoded.length < 8) return {ok:false, error:'Password too short'};

  const userId  = Utilities.getUuid();
  const passHash = hashPassword(passDecoded);

  appendRow(S_USERS, {
    userId, firstName:fname, lastName:lname,
    email:emailLower, company:company||'',
    passHash, createdAt:nowISO(), lastLogin:'', status:'active'
  });

  // Send welcome email
  try {
    GmailApp.sendEmail(
      emailLower,
      `Welcome to ${APP_NAME}!`,
      `Hi ${fname},\n\nYour account has been created successfully.\n\nEmail: ${emailLower}\n\nStart building your quotations at ConstroBill Pro.\n\nBest regards,\nConstroBill Team`
    );
  } catch(e) {}

  return {ok:true, message:'Account created successfully'};
}

// ── LOGIN ──────────────────────────────────────────────────────────────
function handleLogin(body) {
  const {email, pass} = body;
  if (!email||!pass) return {ok:false, error:'Missing email or password'};

  const emailLower = email.toLowerCase().trim();
  const users = getAllRows(S_USERS);
  const user  = users.find(u => u.email === emailLower);

  if (!user || user.status === 'disabled') {
    return {ok:false, error:'Invalid email or password'};
  }

  const passDecoded = Utilities.newBlob(
    Utilities.base64Decode(pass)
  ).getDataAsString();

  if (hashPassword(passDecoded) !== user.passHash) {
    return {ok:false, error:'Invalid email or password'};
  }

  // Create session token
  const token     = generateToken();
  const expiresAt = addHours(TOKEN_HOURS);

  appendRow(S_SESSIONS, {
    token, userId:user.userId, email:emailLower,
    createdAt:nowISO(), expiresAt, ip:'', lastUsed:nowISO()
  });

  // Update last login
  updateRow(S_USERS, 'email', emailLower, {lastLogin: nowISO()});

  return {
    ok: true,
    token,
    userId: user.userId,
    user: {
      name: user.firstName + ' ' + user.lastName,
      email: emailLower,
      company: user.company,
      userId: user.userId
    }
  };
}

// ── VALIDATE TOKEN ────────────────────────────────────────────────────
function handleValidateToken(body) {
  const {token} = body;
  if (!token) return {ok:false, error:'No token'};

  const session = findSession(token);
  if (!session) return {ok:false, error:'Session expired or invalid'};

  // Refresh last used
  updateRow(S_SESSIONS, 'token', token, {lastUsed: nowISO()});

  const users = getAllRows(S_USERS);
  const user  = users.find(u => u.userId === session.userId);
  if (!user || user.status === 'disabled') return {ok:false, error:'Account disabled'};

  return {
    ok: true,
    user: {
      name: user.firstName + ' ' + user.lastName,
      email: user.email,
      company: user.company,
      userId: user.userId
    }
  };
}

// ── FORGOT PASSWORD ───────────────────────────────────────────────────
function handleForgot(body) {
  const {email} = body;
  if (!email) return {ok:false, error:'No email provided'};

  const emailLower = email.toLowerCase().trim();
  const users = getAllRows(S_USERS);
  const user  = users.find(u => u.email === emailLower);

  if (!user) return {ok:true}; // Don't reveal if email exists

  const token     = generateToken();
  const expiresAt = addHours(2); // 2 hour expiry

  appendRow(S_RESETS, {
    token, email:emailLower,
    createdAt:nowISO(), expiresAt, used:'false'
  });

  const resetUrl = ScriptApp.getService().getUrl() + '?action=resetPassword&token=' + token;
  // Your live app URL for reference in emails
  // const appUrl = APP_URL;

  GmailApp.sendEmail(
    emailLower,
    `${APP_NAME} — Password Reset`,
    `Hi ${user.firstName},\n\nYou requested a password reset.\n\nClick the link below to reset your password (expires in 2 hours):\n${resetUrl}\n\nIf you did not request this, you can ignore this email.\n\nBest regards,\nConstroBill Team`
  );

  return {ok:true};
}

// ── RESET PASSWORD PAGE ───────────────────────────────────────────────
function handleResetPasswordPage(e) {
  const token = e.parameter.token;
  const resets = getAllRows(S_RESETS);
  const reset  = resets.find(r => r.token === token && r.used === 'false');

  if (!reset || new Date(reset.expiresAt) < new Date()) {
    return HtmlService.createHtmlOutput('<h2>❌ Reset link is invalid or expired.</h2><p>Please request a new password reset.</p>');
  }

  return HtmlService.createHtmlOutput(`
    <!DOCTYPE html><html><head><meta charset="UTF-8">
    <title>Reset Password — ${APP_NAME}</title>
    <style>body{font-family:Arial,sans-serif;background:#0d0f1a;color:#e8eaf6;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;}
    .card{background:#151827;border:1px solid #2e3350;border-radius:12px;padding:32px;width:360px;}
    h2{color:#4f7cff;margin-bottom:20px;} input{width:100%;padding:10px;border-radius:7px;border:1px solid #2e3350;background:#1e2236;color:#e8eaf6;font-size:14px;margin-bottom:14px;box-sizing:border-box;}
    button{width:100%;padding:12px;background:#4f7cff;color:#fff;border:none;border-radius:7px;font-size:14px;font-weight:700;cursor:pointer;}
    .msg{padding:10px;border-radius:7px;margin-bottom:12px;font-size:13px;}</style>
    </head><body>
    <div class="card">
      <h2>🔑 Reset Password</h2>
      <div id="msg"></div>
      <input type="password" id="p1" placeholder="New password (min 8 characters)"/>
      <input type="password" id="p2" placeholder="Confirm new password"/>
      <button onclick="reset()">Set New Password</button>
    </div>
    <script>
    async function reset(){
      const p1=document.getElementById('p1').value;
      const p2=document.getElementById('p2').value;
      const msg=document.getElementById('msg');
      if(p1.length<8){msg.style.cssText='background:rgba(255,79,79,.2);color:#ff4f4f;';msg.textContent='Password must be at least 8 characters.';return;}
      if(p1!==p2){msg.style.cssText='background:rgba(255,79,79,.2);color:#ff4f4f;';msg.textContent='Passwords do not match.';return;}
      const r=await fetch(location.href.split('?')[0],{method:'POST',body:JSON.stringify({action:'resetPassword',token:'${token}',newPass:btoa(p1)}),headers:{'Content-Type':'application/json'}});
      const d=await r.json();
      if(d.ok){msg.style.cssText='background:rgba(30,217,122,.2);color:#1ed97a;';msg.textContent='✅ Password updated! You can now sign in.';}
      else{msg.style.cssText='background:rgba(255,79,79,.2);color:#ff4f4f;';msg.textContent=d.error||'Error occurred.';}
    }
    <\/script></body></html>`);
}

function handleResetPassword(body) {
  const {token, newPass} = body;
  if (!token||!newPass) return {ok:false, error:'Missing token or password'};

  const resets = getAllRows(S_RESETS);
  const reset  = resets.find(r => r.token === token && r.used === 'false');
  if (!reset || new Date(reset.expiresAt) < new Date()) {
    return {ok:false, error:'Reset link is invalid or expired'};
  }

  const passDecoded = Utilities.newBlob(
    Utilities.base64Decode(newPass)
  ).getDataAsString();
  if (passDecoded.length < 8) return {ok:false, error:'Password too short'};

  const passHash = hashPassword(passDecoded);
  updateRow(S_USERS,   'email', reset.email, {passHash});
  updateRow(S_RESETS,  'token', token,        {used:'true'});

  // Invalidate all existing sessions for this user
  const sessions = getAllRows(S_SESSIONS);
  sessions.filter(s => s.email === reset.email).forEach(s => {
    deleteRow(S_SESSIONS, 'token', s.token);
  });

  return {ok:true};
}

// ── SESSION LOOKUP ────────────────────────────────────────────────────
// Reads only the columns it needs instead of pulling the whole sheet.
function findSession(token) {
  if (!token) return null;
  const sheet = getSheet(S_SESSIONS);
  const last  = sheet.getLastRow();
  if (last < 2) return null;

  // token | userId | email | createdAt | expiresAt
  const vals = sheet.getRange(2, 1, last - 1, 5).getValues();
  for (let i = 0; i < vals.length; i++) {
    if (String(vals[i][0]) !== String(token)) continue;
    if (new Date(vals[i][4]) < new Date()) return null; // expired
    return {
      row: i + 2,
      token: String(vals[i][0]),
      userId: String(vals[i][1]),
      email: String(vals[i][2])
    };
  }
  return null;
}

// ── USERDATA INDEX ────────────────────────────────────────────────────
// Returns {row, userId, dataKey} for every UserData row WITHOUT reading the
// dataValue column. Reading dataValue meant pulling every user's entire
// JSON blob (megabytes, including base64 images) on every save and load,
// which is what pushed requests past the Apps Script execution limit.
function dataIndex(sheet) {
  const last = sheet.getLastRow();
  if (last < 2) return [];
  const vals = sheet.getRange(2, 1, last - 1, 3).getValues(); // userId | email | dataKey
  const out = [];
  for (let i = 0; i < vals.length; i++) {
    out.push({row: i + 2, userId: String(vals[i][0]), dataKey: String(vals[i][2])});
  }
  return out;
}

// All rows belonging to one user + key, in chunk order.
// Matches both the new chunked form ("main::0") and the legacy single-row
// form ("main") written by v1 of this script.
function findDataRows(index, userId, key) {
  const rows = index.filter(r =>
    r.userId === userId && (r.dataKey === key || r.dataKey.indexOf(key + '::') === 0)
  );
  rows.forEach(r => {
    const sep = r.dataKey.indexOf('::');
    r.chunk = sep === -1 ? 0 : (parseInt(r.dataKey.slice(sep + 2), 10) || 0);
  });
  rows.sort((a, b) => a.chunk - b.chunk);
  return rows;
}

// ── SAVE USER DATA ────────────────────────────────────────────────────
function handleSaveData(body) {
  const {token, key, value} = body;
  if (!token || !key) return {ok:false, error:'Missing token or key'};

  const session = findSession(token);
  if (!session) return {ok:false, error:'Invalid or expired session'};

  // Two devices saving at once used to interleave their row writes and
  // corrupt the stored JSON. Serialise writes.
  const lock = LockService.getScriptLock();
  try { lock.waitLock(25000); }
  catch(e) { return {ok:false, error:'Server is busy — please try again'}; }

  try {
    const sheet  = getSheet(S_DATA);
    const userId = session.userId;
    const email  = session.email;
    const str    = JSON.stringify(value);
    const now    = nowISO();

    // Split into cell-sized chunks
    const chunks = [];
    for (let i = 0; i < str.length; i += MAX_CELL) {
      chunks.push(CHUNK_TAG + str.substr(i, MAX_CELL));
    }
    if (!chunks.length) chunks.push(CHUNK_TAG);

    const existing = findDataRows(dataIndex(sheet), userId, key);

    // 1. Overwrite the rows we can reuse
    const reuse = Math.min(existing.length, chunks.length);
    for (let i = 0; i < reuse; i++) {
      sheet.getRange(existing[i].row, 1, 1, 6).setValues([[
        userId, email, key + '::' + i, chunks[i], now, chunks[i].length
      ]]);
    }

    // 2. Append any chunks that did not fit in existing rows
    if (chunks.length > existing.length) {
      const extra = [];
      for (let i = existing.length; i < chunks.length; i++) {
        extra.push([userId, email, key + '::' + i, chunks[i], now, chunks[i].length]);
      }
      sheet.getRange(sheet.getLastRow() + 1, 1, extra.length, 6).setValues(extra);
    }

    // 3. Drop rows left over from a previously larger payload
    //    (descending, so earlier row numbers stay valid)
    for (let i = existing.length - 1; i >= chunks.length; i--) {
      sheet.deleteRow(existing[i].row);
    }

    SpreadsheetApp.flush();
    return {ok:true, savedAt:now, sizeBytes:str.length, chunks:chunks.length};

  } catch(err) {
    logAction('ERROR', 'saveData: ' + err.message);
    return {ok:false, error:'Save failed: ' + err.message};
  } finally {
    lock.releaseLock();
  }
}

// ── LOAD USER DATA ────────────────────────────────────────────────────
function handleLoadData(body) {
  const {token, key} = body;
  if (!token || !key) return {ok:false, error:'Missing token or key'};

  const session = findSession(token);
  if (!session) return {ok:false, error:'Invalid or expired session'};

  const sheet = getSheet(S_DATA);
  const rows  = findDataRows(dataIndex(sheet), session.userId, key);
  if (!rows.length) return {ok:true, value:null};

  let str = '';
  for (let i = 0; i < rows.length; i++) {
    let cell = String(sheet.getRange(rows[i].row, 4).getValue());
    // Legacy rows (dataKey with no "::") were stored untagged
    if (cell.charAt(0) === CHUNK_TAG) cell = cell.slice(1);
    str += cell;
  }

  if (!str) return {ok:true, value:null};

  try {
    return {ok:true, value:JSON.parse(str)};
  } catch(e) {
    // Never silently hand back half a payload — the client would then
    // overwrite good cloud data with a partial merge.
    return {ok:false, error:'Stored data is corrupted and could not be read'};
  }
}

// ── DELETE ACCOUNT ───────────────────────────────────────────────────
function handleDeleteAccount(body) {
  const {token} = body;
  const session = findSession(token);
  if (!session) return {ok:false, error:'Invalid session'};

  deleteRow(S_SESSIONS, 'userId', session.userId);
  deleteRow(S_DATA,     'userId', session.userId);
  updateRow(S_USERS,    'userId', session.userId, {status:'deleted'});

  return {ok:true};
}

// ── GOOGLE LOGIN (via Google Identity Services JWT) ──────────────────
function handleGoogleLogin(body) {
  const {credential} = body;
  if (!credential) return {ok:false, error:'No Google credential provided'};

  try {
    // Decode the JWT payload (index 1 of the 3 parts)
    const parts = credential.split('.');
    if (parts.length !== 3) return {ok:false, error:'Invalid Google credential format'};

    const payload = JSON.parse(
      Utilities.newBlob(Utilities.base64Decode(
        parts[1].replace(/-/g,'+').replace(/_/g,'/')
      )).getDataAsString()
    );

    // Verify expiry
    if (payload.exp && payload.exp * 1000 < Date.now()) {
      return {ok:false, error:'Google credential has expired. Please try again.'};
    }

    const email     = (payload.email||'').toLowerCase();
    const name      = payload.name || email;
    const firstName = payload.given_name  || name.split(' ')[0] || '';
    const lastName  = payload.family_name || name.split(' ').slice(1).join(' ') || '';
    const googleId  = payload.sub;

    if (!email) return {ok:false, error:'Could not get email from Google account'};

    // Check if user exists
    const users = getAllRows(S_USERS);
    let user = users.find(u => u.email === email);

    if (!user) {
      // Auto-register Google user
      const userId = 'g_' + googleId;
      appendRow(S_USERS, {
        userId, firstName, lastName,
        email, company: '',
        passHash: 'GOOGLE_AUTH_'+googleId,
        createdAt: nowISO(), lastLogin: nowISO(), status: 'active'
      });
      user = {userId, firstName, lastName, email};
    } else if (user.status === 'disabled') {
      return {ok:false, error:'This account has been disabled'};
    }

    // Create session
    const token     = generateToken();
    const expiresAt = addHours(TOKEN_HOURS);
    appendRow(S_SESSIONS, {
      token, userId: user.userId, email,
      createdAt: nowISO(), expiresAt, ip:'', lastUsed: nowISO()
    });
    updateRow(S_USERS, 'email', email, {lastLogin: nowISO()});

    return {
      ok: true,
      token,
      userId: user.userId,
      user: {
        name: user.firstName + ' ' + user.lastName,
        email,
        company: user.company || '',
        userId: user.userId
      }
    };
  } catch(err) {
    return {ok:false, error:'Google login error: ' + err.message};
  }
}

// ── GOOGLE OAUTH PAGE (legacy stub) ─────────────────────────────────
function handleGoogleOAuth(e) {
  // Implement Google OAuth using ScriptApp if needed
  // For now returns a simple page
  return HtmlService.createHtmlOutput(`
    <html><head><title>Google Sign-In</title></head>
    <body style="font-family:Arial;text-align:center;padding:40px;">
    <h2>Google Sign-In</h2>
    <p>Configure Google OAuth in Apps Script to enable this feature.</p>
    <button onclick="window.close()">Close</button>
    </body></html>`);
}

// ── MAINTENANCE: CLEANUP EXPIRED SESSIONS ────────────────────────────
function cleanupExpiredSessions() {
  const now = new Date();

  // Collect the row numbers first, then delete bottom-up in one pass.
  // The old version re-read the entire sheet for every single deletion.
  function purge(sheetName, keepFn) {
    const sheet = getSheet(sheetName);
    const last  = sheet.getLastRow();
    if (last < 2) return;
    const vals = sheet.getRange(2, 1, last - 1, sheet.getLastColumn()).getValues();
    for (let i = vals.length - 1; i >= 0; i--) {
      if (!keepFn(vals[i])) sheet.deleteRow(i + 2);
    }
  }

  // Sessions: token | userId | email | createdAt | expiresAt
  purge(S_SESSIONS, row => new Date(row[4]) >= now);
  // Resets: token | email | createdAt | expiresAt | used
  purge(S_RESETS, row => !(String(row[4]) === 'true' || new Date(row[3]) < now));
}

// ── TRIGGER: Set up daily cleanup ────────────────────────────────────
function setupDailyCleanup() {
  // Remove any previous copy so re-running does not stack up triggers
  ScriptApp.getProjectTriggers().forEach(t => {
    if (t.getHandlerFunction() === 'cleanupExpiredSessions') ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('cleanupExpiredSessions')
    .timeBased()
    .everyDays(1)
    .atHour(3)
    .create();
  notify('✅ Daily cleanup trigger created!');
}

// ── MAINTENANCE: TRIM THE AUDIT LOG ──────────────────────────────────
// Earlier versions logged every autosave, so this sheet can be enormous.
// Run once to cut it back to the most recent 2,000 entries.
function trimAuditLog() {
  const sheet = getSheet(S_LOGS);
  const keep  = 2000;
  const last  = sheet.getLastRow();
  if (last <= keep + 1) { notify('AuditLog is already small (' + (last - 1) + ' rows).'); return; }
  sheet.deleteRows(2, last - 1 - keep);
  notify('✅ AuditLog trimmed to the most recent ' + keep + ' entries.');
}

// ── MAINTENANCE: REPORT STORAGE USE PER USER ─────────────────────────
function reportStorage() {
  const sheet = getSheet(S_DATA);
  const last  = sheet.getLastRow();
  if (last < 2) { notify('No user data stored yet.'); return; }
  const vals = sheet.getRange(2, 1, last - 1, 6).getValues();
  const per  = {};
  vals.forEach(r => { per[r[1] || r[0]] = (per[r[1] || r[0]] || 0) + (Number(r[5]) || 0); });
  const lines = Object.keys(per).map(k => k + ': ' + Math.round(per[k] / 1024) + ' KB');
  notify('Storage per user:\n' + lines.join('\n'));
}
