// 自分専用の秘書アプリ - サーバー（外部ライブラリ不要）
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, 'data.json');
const PUBLIC_DIR = path.join(__dirname, 'public');

// ---- データ保存 ----
function loadData() {
  try {
    const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    return { memos: data.memos || [], tasks: data.tasks || [] };
  } catch {
    return { memos: [], tasks: [] };
  }
}

function saveData(data) {
  const tmp = DATA_FILE + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2), 'utf8');
  fs.renameSync(tmp, DATA_FILE); // 途中で落ちてもファイルが壊れないように
}

let data = loadData();

// ---- ユーティリティ ----
function sendJson(res, status, body) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(body));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', (chunk) => {
      raw += chunk;
      if (raw.length > 1e6) req.destroy();
    });
    req.on('end', () => {
      try { resolve(raw ? JSON.parse(raw) : {}); } catch (e) { reject(e); }
    });
    req.on('error', reject);
  });
}

// ---- API ----
async function handleApi(req, res, pathname) {
  // メモ
  if (pathname === '/api/memos' && req.method === 'GET') {
    return sendJson(res, 200, data.memos);
  }
  if (pathname === '/api/memos' && req.method === 'POST') {
    const { title, body } = await readBody(req);
    if (!title || !String(title).trim()) return sendJson(res, 400, { error: 'タイトルを入力してください' });
    const memo = {
      id: crypto.randomUUID(),
      title: String(title).trim(),
      body: String(body || ''),
      createdAt: new Date().toISOString(),
    };
    data.memos.unshift(memo);
    saveData(data);
    return sendJson(res, 201, memo);
  }

  // タスク
  if (pathname === '/api/tasks' && req.method === 'GET') {
    return sendJson(res, 200, data.tasks);
  }
  if (pathname === '/api/tasks' && req.method === 'POST') {
    const { title } = await readBody(req);
    if (!title || !String(title).trim()) return sendJson(res, 400, { error: 'タスクを入力してください' });
    const task = {
      id: crypto.randomUUID(),
      title: String(title).trim(),
      done: false,
      createdAt: new Date().toISOString(),
      completedAt: null,
    };
    data.tasks.unshift(task);
    saveData(data);
    return sendJson(res, 201, task);
  }

  const m = pathname.match(/^\/api\/tasks\/([\w-]+)(\/complete)?$/);
  if (m) {
    const task = data.tasks.find((t) => t.id === m[1]);
    if (!task) return sendJson(res, 404, { error: 'タスクが見つかりません' });

    // 完了 / 未完了の切り替え
    if (m[2] && req.method === 'PATCH') {
      task.done = !task.done;
      task.completedAt = task.done ? new Date().toISOString() : null;
      saveData(data);
      return sendJson(res, 200, task);
    }
    // 削除
    if (!m[2] && req.method === 'DELETE') {
      data.tasks = data.tasks.filter((t) => t.id !== task.id);
      saveData(data);
      return sendJson(res, 200, { ok: true });
    }
  }

  return sendJson(res, 404, { error: 'Not Found' });
}

// ---- 静的ファイル ----
const MIME = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript' };

function serveStatic(res, pathname) {
  const file = path.normalize(path.join(PUBLIC_DIR, pathname === '/' ? 'index.html' : pathname));
  if (!file.startsWith(PUBLIC_DIR)) { res.writeHead(403); return res.end(); }
  fs.readFile(file, (err, content) => {
    if (err) { res.writeHead(404); return res.end('Not Found'); }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream' });
    res.end(content);
  });
}

// ---- サーバー起動 ----
http.createServer(async (req, res) => {
  const { pathname } = new URL(req.url, `http://${req.headers.host}`);
  try {
    if (pathname.startsWith('/api/')) return await handleApi(req, res, pathname);
    serveStatic(res, pathname);
  } catch (e) {
    sendJson(res, 400, { error: 'リクエストが不正です' });
  }
}).listen(PORT, () => {
  console.log(`秘書アプリ起動中: http://localhost:${PORT}`);
});
