// App.jsx
import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate, useParams } from 'react-router-dom';
import { nanoid } from 'nanoid';

// Dummy Logging middleware function (replace with your real one)
const logger = {
  info: (msg, meta) => {
    // Your custom logging here
    console.log('[LOG]', msg, meta);
  },
  error: (msg, meta) => {
    console.error('[ERROR]', msg, meta);
  },
};

function Home({ onShorten }) {
  const [originalUrl, setOriginalUrl] = useState('');
  const [customCode, setCustomCode] = useState('');
  const [validity, setValidity] = useState('');
  const [error, setError] = useState(null);
  const [shortUrl, setShortUrl] = useState(null);

  const handleSubmit = (e) => {
    e.preventDefault();

    setError(null);
    if (!originalUrl.match(/^https?:\/\/.+/)) {
      setError('URL must start with http:// or https://');
      logger.error('Invalid URL format submitted', { originalUrl });
      return;
    }

    // Validate custom code if given
    if (customCode) {
      if (!/^[a-zA-Z0-9_-]{4,20}$/.test(customCode)) {
        setError('Custom shortcode must be 4-20 chars alphanumeric/_/-');
        logger.error('Invalid custom shortcode', { customCode });
        return;
      }
    }

    // Parse validity or default to 30
    const validityMinutes = parseInt(validity) || 30;

    // Call parent to create shortened URL
    try {
      const result = onShorten(originalUrl, customCode, validityMinutes);
      setShortUrl(result);
      logger.info('Short URL created', { originalUrl, customCode, validityMinutes });
    } catch (ex) {
      setError(ex.message);
      logger.error('Error creating short URL', { error: ex.message });
    }
  };

  return (
    <div style={{ maxWidth: 600, margin: 'auto', padding: 20 }}>
      <h1>React URL Shortener</h1>
      <form onSubmit={handleSubmit}>
        <label>
          Long URL:<br />
          <input
            type="url"
            value={originalUrl}
            onChange={e => setOriginalUrl(e.target.value)}
            required
            style={{ width: '100%' }}
            placeholder="https://example.com"
          />
        </label>
        <br /><br />
        <label>
          Custom shortcode (optional):<br />
          <input
            type="text"
            value={customCode}
            onChange={e => setCustomCode(e.target.value)}
            placeholder="mycode123"
            style={{ width: '100%' }}
          />
        </label>
        <br /><br />
        <label>
          Validity (minutes, default 30):<br />
          <input
            type="number"
            value={validity}
            onChange={e => setValidity(e.target.value)}
            min={1}
            placeholder="30"
            style={{ width: '100%' }}
          />
        </label>
        <br /><br />
        <button type="submit">Shorten URL</button>
      </form>

      {error && <p style={{ color: 'red' }}>{error}</p>}

      {shortUrl && (
        <div style={{ marginTop: 20 }}>
          <h3>Shortened URL:</h3>
          <a href={shortUrl} target="_blank" rel="noopener noreferrer">{shortUrl}</a>
        </div>
      )}
    </div>
  );
}

function Redirector({ urlMap, removeExpired }) {
  const { code } = useParams();
  const navigate = useNavigate();
  const [message, setMessage] = useState('Redirecting...');

  useEffect(() => {
    // Check mapping for code
    const record = urlMap[code];
    if (!record) {
      setMessage('❌ Short URL not found.');
      logger.error('Redirect failed: code not found', { code });
      return;
    }

    if (Date.now() > record.expiry) {
      setMessage('⏰ This link has expired.');
      logger.info('Redirect failed: link expired', { code });
      removeExpired(code);
      return;
    }

    logger.info('Redirecting to original URL', { code, url: record.originalUrl });
    // Redirect after brief delay for UX
    setTimeout(() => {
      window.location.href = record.originalUrl;
    }, 1000);
  }, [code, urlMap, removeExpired]);

  return (
    <div style={{ textAlign: 'center', marginTop: 50 }}>
      <h2>{message}</h2>
      {message !== 'Redirecting...' && (
        <a href="/">Go back home</a>
      )}
    </div>
  );
}

function Stats({ urlMap }) {
  return (
    <div style={{ maxWidth: 600, margin: 'auto', marginTop: 40 }}>
      <h2>URL Analytics</h2>
      {Object.keys(urlMap).length === 0 ? (
        <p>No URLs shortened yet.</p>
      ) : (
        <table border="1" cellPadding="10" cellSpacing="0" style={{ width: '100%' }}>
          <thead>
            <tr>
              <th>Shortcode</th>
              <th>Original URL</th>
              <th>Expires In</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(urlMap).map(([code, { originalUrl, expiry }]) => {
              const expiresInMs = expiry - Date.now();
              const expiresInMin = Math.max(0, Math.floor(expiresInMs / 60000));
              return (
                <tr key={code}>
                  <td>{code}</td>
                  <td><a href={originalUrl} target="_blank" rel="noopener noreferrer">{originalUrl}</a></td>
                  <td>{expiresInMin} min</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}

function App() {
  // urlMap: { shortcode: { originalUrl, expiry } }
  const [urlMap, setUrlMap] = useState({});

  // Generate or validate shortcode uniqueness
  const createShortCode = (customCode) => {
    if (customCode) {
      if (urlMap[customCode]) throw new Error('Custom shortcode already exists');
      return customCode;
    }
    let newCode;
    do {
      newCode = nanoid(6);
    } while (urlMap[newCode]);
    return newCode;
  };

  const handleShorten = (originalUrl, customCode, validityMinutes) => {
    const shortcode = createShortCode(customCode);
    const expiry = Date.now() + validityMinutes * 60 * 1000;

    setUrlMap(prev => ({
      ...prev,
      [shortcode]: { originalUrl, expiry },
    }));

    const shortenedUrl = `${window.location.origin}/${shortcode}`;
    return shortenedUrl;
  };

  const removeExpired = (code) => {
    setUrlMap(prev => {
      const copy = { ...prev };
      delete copy[code];
      return copy;
    });
  };

  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home onShorten={handleShorten} />} />
        <Route path="/stats" element={<Stats urlMap={urlMap} />} />
        <Route path="/:code" element={<Redirector urlMap={urlMap} removeExpired={removeExpired} />} />
      </Routes>
    </Router>
  );
}

export default App;
