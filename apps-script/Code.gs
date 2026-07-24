/**
 * olive-portal（従業員管理）— Google スプレッドシート＋ドライブ連携API
 *
 * 使い方：
 *  1. Google スプレッドシートを新規作成
 *  2. 拡張機能 → Apps Script を開き、このコードを貼り付け
 *  3. デプロイ → デプロイを管理 → 編集(鉛筆) → バージョン「新バージョン」→ デプロイ
 *     （初回は「新しいデプロイ」→ ウェブアプリ / アクセス:全員）
 *     → 表示されるウェブアプリURL（.../exec）をアプリ側に設定する
 *
 * データ：employees シートに 1行 = 1従業員（JSON）
 * 契約書：ドライブのフォルダ「olive-portal-契約書」に保存し、fileId を従業員に紐付け（同期される）。
 *         閲覧はパスワード認証つきの getContract 経由のみ（ファイルは非公開のまま）。
 *
 * ※ APP_PASSWORD はログインパスワード。変更したい時はここを書き換える。
 *   （このコードは公開されません。公開されるのは実行用URLのみ）
 */

var SHEET_NAME = 'employees';
var CONTRACTS_FOLDER = 'olive-portal-契約書';
var APP_PASSWORD = 'ここにパスワードを入れる';  // ← 実際のパスワードに置き換える（このファイルは公開リポジトリのためダミー）

// エディタで1回だけ実行して、スプレッドシートとドライブへのアクセスを承認する用
function authorize() {
  SpreadsheetApp.getActiveSpreadsheet().getName();
  contractsFolder();
  return 'ok';
}

function doGet(e) { return handle(e); }
function doPost(e) { return handle(e); }

function handle(e) {
  try {
    var body = {};
    if (e && e.postData && e.postData.contents) {
      body = JSON.parse(e.postData.contents);
    } else if (e && e.parameter) {
      body = e.parameter;
    }
    if (String(body.password || '') !== String(APP_PASSWORD)) return out({ ok: false, error: 'unauthorized' });

    var action = body.action;
    if (action === 'load') return out({ ok: true, employees: readAll() });
    if (action === 'save') { writeAll(body.employees || []); return out({ ok: true, count: (body.employees || []).length }); }
    if (action === 'uploadContract') return out(uploadContract(body));
    if (action === 'getContract') return out(getContract(body));
    if (action === 'deleteContract') return out(deleteContract(body));
    return out({ ok: false, error: 'unknown_action' });
  } catch (err) {
    return out({ ok: false, error: String(err) });
  }
}

/* ---------- 従業員データ（スプレッドシート） ---------- */
function sheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(SHEET_NAME);
  if (!sh) {
    sh = ss.insertSheet(SHEET_NAME);
    sh.getRange(1, 1).setValue('employee_json');
  }
  return sh;
}
function readAll() {
  var sh = sheet();
  var last = sh.getLastRow();
  if (last < 2) return [];
  var values = sh.getRange(2, 1, last - 1, 1).getValues();
  var arr = [];
  for (var i = 0; i < values.length; i++) {
    var v = values[i][0];
    if (v) { try { arr.push(JSON.parse(v)); } catch (e2) {} }
  }
  return arr;
}
function writeAll(emps) {
  var sh = sheet();
  var last = sh.getLastRow();
  if (last >= 2) sh.getRange(2, 1, last - 1, 1).clearContent();
  if (emps.length) {
    var rows = emps.map(function (e) { return [JSON.stringify(e)]; });
    sh.getRange(2, 1, rows.length, 1).setValues(rows);
  }
}

/* ---------- 契約書（ドライブ） ---------- */
function contractsFolder() {
  var it = DriveApp.getFoldersByName(CONTRACTS_FOLDER);
  if (it.hasNext()) return it.next();
  return DriveApp.createFolder(CONTRACTS_FOLDER);
}
function uploadContract(body) {
  var bytes = Utilities.base64Decode(body.base64);
  var blob = Utilities.newBlob(bytes, body.mimeType || 'application/pdf', body.filename || 'contract.pdf');
  var file = contractsFolder().createFile(blob);
  return { ok: true, fileId: file.getId(), filename: file.getName() };
}
function getContract(body) {
  var f = DriveApp.getFileById(body.fileId);
  var blob = f.getBlob();
  return { ok: true, base64: Utilities.base64Encode(blob.getBytes()), mimeType: blob.getContentType(), filename: f.getName() };
}
function deleteContract(body) {
  DriveApp.getFileById(body.fileId).setTrashed(true);
  return { ok: true };
}

function out(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
