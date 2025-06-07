import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.jsx';
import '../../../old_vanilla_site/kalkulator/css/style.css'

export default function Login() {
  const navigate = useNavigate();
  const { signIn, signUp, resetPassword, loading } = useAuth();
  const [currentView, setCurrentView] = useState('login'); // 'login', 'signup', 'forgot'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [message, setMessage] = useState('');

  const handleBackToHome = () => {
    navigate('/');
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      setMessage('Vennligst fyll ut alle felt');
      return;
    }
    
    try {
      setMessage('Logger inn...');
      await signIn(email, password);
      navigate('/calculator');
    } catch (error) {
      setMessage(error.message || 'Kunne ikke logge inn. Sjekk e-post og passord.');
    }
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    if (!email || !password || !name) {
      setMessage('Vennligst fyll ut alle felt');
      return;
    }
    
    try {
      setMessage('Oppretter konto...');
      await signUp(email, password, { name });
      setMessage('Konto opprettet! Sjekk e-posten din for bekreftelse.');
      setCurrentView('login');
    } catch (error) {
      setMessage(error.message || 'Kunne ikke opprette konto.');
    }
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    if (!email) {
      setMessage('Vennligst oppgi e-postadressen din');
      return;
    }
    
    try {
      setMessage('Sender tilbakestillings-e-post...');
      await resetPassword(email);
      setMessage('E-post for tilbakestilling av passord er sendt!');
    } catch (error) {
      setMessage(error.message || 'Kunne ikke sende tilbakestillings-e-post.');
    }
  };

  return (
    <div style={{paddingBottom: '80px'}}>
      {/* Tilbake til hovedside knapp */}
      <div style={{position: 'absolute', top: '20px', left: '20px', zIndex: '1000'}}>
        <button onClick={handleBackToHome} className="btn btn-secondary" style={{display: 'inline-flex', alignItems: 'center', gap: '8px'}}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m12 19-7-7 7-7"/>
            <path d="M19 12H5"/>
          </svg>
          Tilbake til hovedside
        </button>
      </div>

      {/* Login Card */}
      {currentView === 'login' && (
        <div id="auth-box" className="auth-center">
          <div className="login-card">
            <h2 style={{marginBottom: '20px'}}>Logg inn</h2>
            <form onSubmit={handleLogin}>
              <input 
                type="email" 
                placeholder="E-post" 
                required 
                className="form-control" 
                style={{marginBottom: '12px'}}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <input 
                type="password" 
                placeholder="Passord" 
                required 
                className="form-control" 
                style={{marginBottom: '18px'}}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button type="submit" className="btn btn-primary" style={{marginBottom: '12px'}}>Logg inn</button>
            </form>
            <button onClick={() => setCurrentView('signup')} className="btn btn-secondary" style={{marginBottom: '12px'}}>Opprett ny konto</button>
            <button onClick={() => setCurrentView('forgot')} style={{background:'none', border:'none', color:'var(--accent)', fontSize:'14px', cursor:'pointer', marginTop:'4px'}}>Glemt passord?</button>
            <p style={{color: 'var(--danger)', minHeight: '24px', textAlign: 'center', fontSize: '15px'}}>{message}</p>
          </div>
        </div>
      )}

      {/* Signup Card */}
      {currentView === 'signup' && (
        <div id="signup-card" className="auth-center">
          <div className="login-card">
            <h2 style={{marginBottom: '20px'}}>Opprett ny konto</h2>
            <form onSubmit={handleSignup}>
              <input 
                type="email" 
                placeholder="E-post" 
                required 
                className="form-control" 
                style={{marginBottom: '12px'}}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <input 
                type="password" 
                placeholder="Passord" 
                required 
                className="form-control" 
                style={{marginBottom: '12px'}}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <input 
                type="text" 
                placeholder="Fornavn" 
                required 
                className="form-control" 
                style={{marginBottom: '18px'}}
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
              <button type="submit" className="btn btn-primary" style={{marginBottom: '12px'}}>Opprett konto</button>
            </form>
            <button onClick={() => {setCurrentView('login'); setMessage('');}} className="btn btn-secondary">Tilbake til innlogging</button>
            <p style={{color: 'var(--danger)', minHeight: '24px', textAlign: 'center', fontSize: '15px'}}>{message}</p>
          </div>
        </div>
      )}

      {/* Forgot Password Card */}
      {currentView === 'forgot' && (
        <div id="forgot-card" className="auth-center">
          <div className="login-card">
            <h2 style={{marginBottom: '20px'}}>Tilbakestill passord</h2>
            <form onSubmit={handleForgotPassword}>
              <input 
                type="email" 
                placeholder="E-post" 
                required 
                className="form-control" 
                style={{marginBottom: '18px'}}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <button type="submit" className="btn btn-primary" style={{marginBottom: '12px'}}>Send tilbakestillings-link</button>
            </form>
            <button onClick={() => {setCurrentView('login'); setMessage('');}} className="btn btn-secondary">Tilbake</button>
            <p style={{color: 'var(--danger)', minHeight: '24px', textAlign: 'center', fontSize: '15px'}}>{message}</p>
          </div>
        </div>
      )}

      <div id="complete-profile-card" className="auth-center" style={{display:'none'}}>
        <div className="login-card">
          <h2 style={{marginBottom: '20px'}}>Fullfør profilen din</h2>
          <p style={{marginBottom: '20px', color: 'var(--text-secondary)', textAlign: 'center'}}>
            Vennligst oppgi ditt fornavn for å fullføre profilen din.
          </p>
          <input id="complete-name" type="text" placeholder="Fornavn" required className="form-control" style={{marginBottom: '18px'}} />
          <button id="complete-profile-btn" className="btn btn-primary" style={{marginBottom: '12px'}}>Fullfør profil</button>
          <button id="skip-profile-btn" className="btn btn-secondary">Hopp over (kan gjøres senere)</button>
          <p id="complete-profile-msg" style={{color: 'var(--danger)', minHeight: '24px', textAlign: 'center', fontSize: '15px'}}></p>
        </div>
      </div>

      <footer style={{
          width: '100%',
          background: 'var(--bg-secondary)',
          color: 'var(--text-secondary)',
          textAlign: 'center',
          padding: '18px 10px 18px 10px',
          fontSize: '14px',
          borderTop: '1px solid var(--border)',
          borderRadius: '16px 16px 0 0',
          maxWidth: '600px',
          margin: '0 auto',
          position: 'fixed',
          bottom: '0',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: '50'
      }}>
          Laget av <a href="https://github.com/kkarlsen-productions" target="_blank" style={{color:'var(--accent4)', textDecoration:'none'}}>Hjalmar Samuel Kristensen-Karlsen</a> &middot; 2025
      </footer>
    </div>
  )
}
