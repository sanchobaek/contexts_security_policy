import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './App.css';

interface Comment {
  id: number;
  author: string;
  content: string;
  timestamp: string;
}

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

const XSS_PAYLOADS = [
  { name: '기본 스크립트', payload: '<script>alert("XSS Attack!")</script>' },
  { name: '이미지 태그', payload: '<img src=x onerror=alert("XSS via IMG!")>' },
  { name: 'SVG 태그', payload: '<svg onload=alert("XSS via SVG!")></svg>' },
  { name: 'iframe 공격', payload: '<iframe src="javascript:alert(\'XSS via iframe\')"></iframe>' },
  { name: '이벤트 핸들러', payload: '<button onclick=alert("XSS via click!")>악성 버튼</button>' },
  { name: 'CSS Expression', payload: '<div style="background:url(javascript:alert(\'XSS\'))">CSS Attack</div>' },
  { name: 'Body Onload', payload: '<body onload=alert("XSS!")>' },
  { name: 'Input 태그', payload: '<input type="text" value="test" onfocus=alert("XSS!")>' }
];

function App() {
  const [vulnerableComments, setVulnerableComments] = useState<Comment[]>([]);
  const [protectedComments, setProtectedComments] = useState<Comment[]>([]);
  const [vulnerableForm, setVulnerableForm] = useState({ author: '', content: '' });
  const [protectedForm, setProtectedForm] = useState({ author: '', content: '' });
  const [selectedPayload, setSelectedPayload] = useState('');

  const loadComments = async () => {
    try {
      const [vulnRes, protRes] = await Promise.all([
        axios.get(`${API_URL}/api/vulnerable/comments`),
        axios.get(`${API_URL}/api/protected/comments`)
      ]);
      setVulnerableComments(vulnRes.data);
      setProtectedComments(protRes.data);
    } catch (error) {
      console.error('댓글 로드 실패:', error);
    }
  };

  useEffect(() => {
    loadComments();
  }, []);

  const submitVulnerableComment = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await axios.post(`${API_URL}/api/vulnerable/comments`, vulnerableForm);
      setVulnerableForm({ author: '', content: '' });
      loadComments();
    } catch (error) {
      console.error('취약한 댓글 전송 실패:', error);
    }
  };

  const submitProtectedComment = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await axios.post(`${API_URL}/api/protected/comments`, protectedForm);
      setProtectedForm({ author: '', content: '' });
      loadComments();
    } catch (error) {
      console.error('보호된 댓글 전송 실패:', error);
    }
  };

  const insertPayload = (target: 'vulnerable' | 'protected') => {
    if (target === 'vulnerable') {
      setVulnerableForm(prev => ({ ...prev, content: selectedPayload }));
    } else {
      setProtectedForm(prev => ({ ...prev, content: selectedPayload }));
    }
  };

  return (
    <div className="App">
      <header className="app-header">
        <h1>🛡️ XSS vs CSP 보안 실습</h1>
        <div className="server-links">
          <a href={`${API_URL}/`} target="_blank" rel="noopener noreferrer" className="server-link">
            🖥️ Express 서버 직접 접속
          </a>
        </div>
      </header>

      <div className="info-section">
        <div className="info-card">
          <h3>📋 실습 가이드</h3>
          <ol>
            <li>아래 XSS 공격 코드 중 하나를 선택</li>
            <li>취약한 사이트와 보호된 사이트 양쪽에 동일한 코드 입력</li>
            <li>개발자 도구(F12) → Console 탭에서 차이점 확인</li>
            <li>보호된 사이트에서는 CSP 위반 경고 메시지 확인</li>
          </ol>
        </div>

        <div className="info-card">
          <h3>🎯 CSP 정책 설명</h3>
          <div className="csp-policy">
            <code>
              default-src 'self'; script-src 'self'; object-src 'none'; frame-src 'none'
            </code>
          </div>
          <ul>
            <li><strong>default-src 'self':</strong> 같은 도메인만 허용</li>
            <li><strong>script-src 'self':</strong> 인라인 스크립트 금지</li>
            <li><strong>object-src 'none':</strong> 객체 임베딩 금지</li>
            <li><strong>frame-src 'none':</strong> iframe 로딩 금지</li>
          </ul>
        </div>
      </div>

      <div className="payload-section">
        <h3>⚔️ XSS 공격 테스트</h3>
        <div className="payload-grid">
          {XSS_PAYLOADS.map((item, index) => (
            <button
              key={index}
              className={`payload-btn ${selectedPayload === item.payload ? 'selected' : ''}`}
              onClick={() => setSelectedPayload(item.payload)}
            >
              {item.name}
            </button>
          ))}
        </div>
        {selectedPayload && (
          <div className="payload-preview">
            <h4>선택된 공격 코드:</h4>
            <code>{selectedPayload}</code>
          </div>
        )}
      </div>

      <div className="comments-container">
        <div className="comment-section vulnerable">
          <div className="section-header">
            <h2>🚨 취약한 사이트</h2>
            <div className="status-badge danger">CSP 없음</div>
          </div>
          
          <form onSubmit={submitVulnerableComment}>
            <input
              type="text"
              placeholder="작성자"
              value={vulnerableForm.author}
              onChange={(e) => setVulnerableForm(prev => ({ ...prev, author: e.target.value }))}
              required
            />
            <textarea
              placeholder="댓글 내용 (XSS 코드 테스트)"
              value={vulnerableForm.content}
              onChange={(e) => setVulnerableForm(prev => ({ ...prev, content: e.target.value }))}
              required
            />
            <div className="form-actions">
              <button type="submit" className="submit-btn vulnerable-btn">댓글 작성</button>
              <button 
                type="button" 
                className="payload-insert-btn"
                onClick={() => insertPayload('vulnerable')}
                disabled={!selectedPayload}
              >
                공격 코드 삽입
              </button>
            </div>
          </form>

          <div className="comments-list">
            {vulnerableComments.map((comment) => (
              <div key={comment.id} className="comment vulnerable-comment">
                <div className="comment-header">
                  <strong>{comment.author}</strong>
                  <small>{new Date(comment.timestamp).toLocaleString()}</small>
                </div>
                <div 
                  className="comment-content"
                  dangerouslySetInnerHTML={{ __html: comment.content }}
                />
              </div>
            ))}
          </div>
        </div>

        <div className="comment-section protected">
          <div className="section-header">
            <h2>🛡️ 보호된 사이트</h2>
            <div className="status-badge safe">CSP 적용됨</div>
          </div>
          
          <form onSubmit={submitProtectedComment}>
            <input
              type="text"
              placeholder="작성자"
              value={protectedForm.author}
              onChange={(e) => setProtectedForm(prev => ({ ...prev, author: e.target.value }))}
              required
            />
            <textarea
              placeholder="댓글 내용"
              value={protectedForm.content}
              onChange={(e) => setProtectedForm(prev => ({ ...prev, content: e.target.value }))}
              required
            />
            <div className="form-actions">
              <button type="submit" className="submit-btn protected-btn">댓글 작성</button>
              <button 
                type="button" 
                className="payload-insert-btn"
                onClick={() => insertPayload('protected')}
                disabled={!selectedPayload}
              >
                공격 코드 삽입
              </button>
            </div>
          </form>

          <div className="comments-list">
            {protectedComments.map((comment) => (
              <div key={comment.id} className="comment protected-comment">
                <div className="comment-header">
                  <strong>{comment.author}</strong>
                  <small>{new Date(comment.timestamp).toLocaleString()}</small>
                </div>
                <div className="comment-content">
                  {comment.content}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="footer">
        <p>🔍 개발자 도구(F12) → Console을 열어서 CSP 위반 메시지를 확인하세요!</p>
      </div>
    </div>
  );
}

export default App;