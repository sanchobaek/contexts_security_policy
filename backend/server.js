const express = require('express');
const cors = require('cors');
const he = require('he');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors({
  origin: ['http://localhost:3000', 'https://your-s3-bucket.s3-website-region.amazonaws.com'],
  credentials: true
}));

let vulnerableComments = [];
let protectedComments = [];

// Main landing page
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="ko">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>XSS vs CSP 실습</title>
        <style>
            body { 
                font-family: Arial, sans-serif; 
                max-width: 800px; 
                margin: 0 auto; 
                padding: 20px;
                background: #f5f5f5;
            }
            .container { 
                background: white; 
                padding: 30px; 
                border-radius: 10px; 
                box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            }
            .warning { 
                background: #fff3cd; 
                border: 1px solid #ffeaa7; 
                padding: 15px; 
                border-radius: 5px; 
                margin: 20px 0;
            }
            .links { 
                display: flex; 
                gap: 20px; 
                margin: 30px 0;
            }
            .btn { 
                padding: 15px 30px; 
                text-decoration: none; 
                border-radius: 5px; 
                font-weight: bold;
                transition: all 0.3s;
            }
            .vulnerable { 
                background: #ff6b6b; 
                color: white; 
            }
            .protected { 
                background: #51cf66; 
                color: white; 
            }
            .btn:hover { 
                transform: translateY(-2px); 
                box-shadow: 0 4px 10px rgba(0,0,0,0.2);
            }
            .react-link {
                background: #61dafb;
                color: #282c34;
                display: inline-block;
                margin-top: 20px;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <h1>🛡️ XSS vs CSP 보안 실습</h1>
            <div class="warning">
                <strong>⚠️ 주의:</strong> 이 사이트는 교육 목적으로 제작된 취약점 데모입니다.
            </div>
            
            <h2>📋 실습 개요</h2>
            <p>이 프로젝트는 XSS(Cross-Site Scripting) 공격과 CSP(Content Security Policy) 방어의 차이점을 실습할 수 있습니다.</p>
            
            <div class="links">
                <a href="/vulnerable" class="btn vulnerable">🚨 취약한 사이트</a>
                <a href="/protected" class="btn protected">🛡️ 보호된 사이트</a>
            </div>
            
            <a href="http://localhost:3000" class="btn react-link">📱 React 통합 데모</a>
            
            <h2>🎯 학습 목표</h2>
            <ul>
                <li>XSS 공격이 어떻게 작동하는지 이해</li>
                <li>CSP가 어떻게 XSS를 방어하는지 체험</li>
                <li>개발자 도구에서 CSP 위반 확인</li>
                <li>실제 웹 애플리케이션의 보안 설정 실습</li>
            </ul>
        </div>
    </body>
    </html>
  `);
});

// VULNERABLE ENDPOINTS
app.get('/vulnerable', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="ko">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>취약한 사이트 - XSS 위험</title>
        <style>
            body { 
                font-family: Arial, sans-serif; 
                max-width: 800px; 
                margin: 0 auto; 
                padding: 20px;
                background: #ffe6e6;
            }
            .container { 
                background: white; 
                padding: 30px; 
                border-radius: 10px; 
                border: 3px solid #ff6b6b;
            }
            .danger { 
                background: #ffebee; 
                border: 2px solid #ff6b6b; 
                padding: 15px; 
                border-radius: 5px; 
                margin: 20px 0;
                color: #c62828;
            }
            .comment { 
                background: #f5f5f5; 
                padding: 10px; 
                margin: 10px 0; 
                border-radius: 5px;
                border-left: 4px solid #ff6b6b;
            }
            input, textarea { 
                width: 100%; 
                padding: 10px; 
                margin: 5px 0;
                border: 1px solid #ddd;
                border-radius: 5px;
            }
            button { 
                background: #ff6b6b; 
                color: white; 
                padding: 10px 20px; 
                border: none; 
                border-radius: 5px; 
                cursor: pointer;
            }
            .back-btn {
                background: #666;
                margin-right: 10px;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <h1>🚨 취약한 댓글 시스템</h1>
            <div class="danger">
                <strong>위험:</strong> 이 페이지는 CSP가 적용되지 않았으며, 입력값을 그대로 렌더링합니다.
            </div>
            
            <form action="/api/vulnerable/comments" method="POST">
                <input type="text" name="author" placeholder="작성자" required>
                <textarea name="content" placeholder="댓글 내용" required></textarea>
                <button type="submit">댓글 작성</button>
            </form>
            
            <h3>💬 댓글 목록</h3>
            <div id="comments">
                ${vulnerableComments.map(comment => `
                    <div class="comment">
                        <strong>${comment.author}:</strong><br>
                        ${comment.content}
                    </div>
                `).join('')}
            </div>
            
            <div style="margin-top: 30px;">
                <a href="/" class="back-btn" style="color: white; text-decoration: none; padding: 10px 20px; background: #666; border-radius: 5px;">← 홈으로</a>
                <a href="/protected" style="color: white; text-decoration: none; padding: 10px 20px; background: #51cf66; border-radius: 5px;">🛡️ 보호된 사이트</a>
            </div>
        </div>
        
        <script>
            console.log("취약한 페이지 로드됨 - CSP 없음");
        </script>
    </body>
    </html>
  `);
});

app.get('/api/vulnerable/comments', (req, res) => {
  res.json(vulnerableComments);
});

app.post('/api/vulnerable/comments', (req, res) => {
  const { author, content } = req.body;
  const comment = {
    id: Date.now(),
    author: author || 'Anonymous',
    content: content || '',
    timestamp: new Date()
  };
  vulnerableComments.push(comment);
  
  if (req.headers.accept && req.headers.accept.includes('application/json')) {
    res.json({ success: true, comment });
  } else {
    res.redirect('/vulnerable');
  }
});

// PROTECTED ENDPOINTS
app.get('/protected', (req, res) => {
  res.set({
    'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; object-src 'none'; frame-src 'none'; base-uri 'self'; form-action 'self'; report-uri /csp-report"
  });
  
  res.send(`
    <!DOCTYPE html>
    <html lang="ko">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>보호된 사이트 - CSP 적용</title>
        <style>
            body { 
                font-family: Arial, sans-serif; 
                max-width: 800px; 
                margin: 0 auto; 
                padding: 20px;
                background: #e8f5e8;
            }
            .container { 
                background: white; 
                padding: 30px; 
                border-radius: 10px; 
                border: 3px solid #51cf66;
            }
            .safe { 
                background: #e8f5e8; 
                border: 2px solid #51cf66; 
                padding: 15px; 
                border-radius: 5px; 
                margin: 20px 0;
                color: #2e7d2e;
            }
            .comment { 
                background: #f5f5f5; 
                padding: 10px; 
                margin: 10px 0; 
                border-radius: 5px;
                border-left: 4px solid #51cf66;
            }
            input, textarea { 
                width: 100%; 
                padding: 10px; 
                margin: 5px 0;
                border: 1px solid #ddd;
                border-radius: 5px;
            }
            button { 
                background: #51cf66; 
                color: white; 
                padding: 10px 20px; 
                border: none; 
                border-radius: 5px; 
                cursor: pointer;
            }
            .back-btn {
                background: #666;
                margin-right: 10px;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <h1>🛡️ 보호된 댓글 시스템</h1>
            <div class="safe">
                <strong>안전:</strong> 이 페이지는 강력한 CSP가 적용되어 있으며, 모든 입력값을 안전하게 처리합니다.
            </div>
            
            <form action="/api/protected/comments" method="POST">
                <input type="text" name="author" placeholder="작성자" required>
                <textarea name="content" placeholder="댓글 내용" required></textarea>
                <button type="submit">댓글 작성</button>
            </form>
            
            <h3>💬 댓글 목록</h3>
            <div id="comments">
                ${protectedComments.map(comment => `
                    <div class="comment">
                        <strong>${he.encode(comment.author)}:</strong><br>
                        ${he.encode(comment.content)}
                    </div>
                `).join('')}
            </div>
            
            <div style="margin-top: 30px;">
                <a href="/" class="back-btn" style="color: white; text-decoration: none; padding: 10px 20px; background: #666; border-radius: 5px;">← 홈으로</a>
                <a href="/vulnerable" style="color: white; text-decoration: none; padding: 10px 20px; background: #ff6b6b; border-radius: 5px;">🚨 취약한 사이트</a>
            </div>
        </div>
        
        <script>
            console.log("보호된 페이지 로드됨 - CSP 적용");
        </script>
    </body>
    </html>
  `);
});

app.get('/api/protected/comments', (req, res) => {
  res.set({
    'Content-Security-Policy': "default-src 'self'; script-src 'self'; object-src 'none'; frame-src 'none'"
  });
  res.json(protectedComments.map(comment => ({
    ...comment,
    author: he.encode(comment.author),
    content: he.encode(comment.content)
  })));
});

app.post('/api/protected/comments', (req, res) => {
  res.set({
    'Content-Security-Policy': "default-src 'self'; script-src 'self'; object-src 'none'; frame-src 'none'"
  });
  
  const { author, content } = req.body;
  const comment = {
    id: Date.now(),
    author: he.encode(author || 'Anonymous'),
    content: he.encode(content || ''),
    timestamp: new Date()
  };
  protectedComments.push(comment);
  
  if (req.headers.accept && req.headers.accept.includes('application/json')) {
    res.json({ success: true, comment });
  } else {
    res.redirect('/protected');
  }
});

// CSP Report endpoint
app.post('/csp-report', (req, res) => {
  console.log('🚨 CSP Violation Report:', JSON.stringify(req.body, null, 2));
  res.status(204).end();
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date() });
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📍 Main page: http://localhost:${PORT}/`);
  console.log(`🚨 Vulnerable: http://localhost:${PORT}/vulnerable`);
  console.log(`🛡️ Protected: http://localhost:${PORT}/protected`);
});