/**
 * olive-portal（従業員管理）— Google スプレッドシート連携API
 *
 * 使い方：
 *  1. Google スプレッドシートを新規作成
 *  2. 拡張機能 → Apps Script を開き、このコードを貼り付け
 *  3. プロジェクトの設定 → スクリプト プロパティに APP_PASSWORD を追加（共有パスワード）
 *  4. デプロイ → 新しいデプロイ → 種類「ウェブアプリ」
 *       実行するユーザー：自分
 *       アクセスできるユーザー：全員
 *     → 表示されるウェブアプリURL（.../exec）をアプリ側に設定する
 *
 * データは employees シートに 1行 = 1従業員（JSON）で保存される。
 * 写真・PDFはセル容量制限のため保存しない（端末内のみ）。
 */

var SHEET_NAME = 'employees';

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
    var correct = PropertiesService.getScriptProperties().getProperty('APP_PASSWORD');
    if (!correct) return out({ ok: false, error: 'no_password_set' });
    if (String(body.password || '') !== String(correct)) return out({ ok: false, error: 'unauthorized' });

    var action = body.action;
    if (action === 'load') return out({ ok: true, employees: readAll() });
    if (action === 'save') { writeAll(body.employees || []); return out({ ok: true, count: (body.employees || []).length }); }
    return out({ ok: false, error: 'unknown_action' });
  } catch (err) {
    return out({ ok: false, error: String(err) });
  }
}

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

function out(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
