// 結合テスト用のモック GitHub permission API。
// 起動時に PORT を決め、最初の行に JSON（{"port":N}）を stdout へ出す。
// GET /repos/:owner/:repo/collaborators/:user/permission → {"role_name": ...}
// user が "error500" のときは 500 を返す。
import http from 'node:http';

const roles = {
  writer: 'write',
  maintainer: 'maintain',
  adminuser: 'admin',
  reader: 'read',
  triager: 'triage',
};

const server = http.createServer((req, res) => {
  // 本物の API と同じく、GET と認証ヘッダー（テストは GITHUB_TOKEN=t で起動する）が無ければ 401 を返す
  if (req.method !== 'GET' || req.headers.authorization !== 'Bearer t') {
    res.writeHead(401);
    res.end('unauthorized');
    return;
  }
  const m =req.url?.match(/^\/repos\/[^/]+\/[^/]+\/collaborators\/([^/]+)\/permission$/);
  if (!m) {
    res.writeHead(404);
    res.end('not found');
    return;
  }
  const user = decodeURIComponent(m[1]);
  if (user === 'error500') {
    res.writeHead(500);
    res.end('internal error');
    return;
  }
  const role_name = roles[user] ?? 'read';
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ role_name }));
});

server.listen(0, '127.0.0.1', () => {
  const addr = server.address();
  process.stdout.write(JSON.stringify({ port: addr.port }) + '\n');
});
