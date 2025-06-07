import { useNavigate } from 'react-router-dom';
import '../../../css/main.css'

export default function Landing() {
  const navigate = useNavigate();

  const handleGoToCalculator = () => {
    navigate('/login');
  };

  return (
    <>
      <header className="hero">
          <div className="hero-content">
              <div className="logo-wrapper">
                  <img src="kkarlsen_ikon_clean.png" alt="Logo" className="logo" />
              </div>
              <h1>Lönnskalkulator</h1>
              <p className="hero-subtitle">Få oversikt over tilleggene dine</p>
              <p className="hero-description">Sjekk grunnlønn og tillegg for hver eneste vakt!</p>
              <div className="hero-cta">
                  <button onClick={handleGoToCalculator} className="btn btn-primary">Gå til kalkulator</button>
                  <a href="#projects" className="btn btn-secondary">Les mer</a>
              </div>
          </div>
      </header>
      
      <main>
          <section className="projects" id="projects">
              <div className="container">
                  <div className="section-header">
                      <h2>Prosjekter</h2>
                      <div className="section-divider"></div>
                      <p className="section-subtitle">Innovative løsninger jeg har utviklet</p>
                  </div>
                  <div className="projects-grid">
                      <div className="project-card featured">
                          <div className="project-content">
                              <div className="project-icon">
                                  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                      <rect x="3" y="2" width="18" height="20" rx="2" ry="2" fill="var(--accent)"/>
                                      <rect x="6" y="4" width="12" height="4" rx="0.5" ry="0.5" fill="var(--bg-primary)"/>
                                      <rect x="6.5" y="9" width="3" height="3" fill="var(--bg-primary)"/>
                                      <rect x="10.5" y="9" width="3" height="3" fill="var(--bg-primary)"/>
                                      <rect x="14.5" y="9" width="3" height="3" fill="var(--bg-primary)"/>
                                      <rect x="6.5" y="13" width="3" height="3" fill="var(--bg-primary)"/>
                                      <rect x="10.5" y="13" width="3" height="3" fill="var(--bg-primary)"/>
                                      <rect x="14.5" y="13" width="3" height="3" fill="var(--bg-primary)"/>
                                  </svg>
                              </div>
                              <h3>Lönnskalkulator</h3>
                              <p>En avansert webapplikasjon for nøyaktig beregning av månedslønn basert på vakter, arbeidstid og tariffbasert timelønn. Inkluderer autentisering, datapersistering og responsivt design.</p>
                              <div className="project-features">
                                  <span className="feature-tag">HTML</span>
                                  <span className="feature-tag">Supabase</span>
                                  <span className="feature-tag">JavaScript</span>
                                  <span className="feature-tag">Zoho</span>
                              </div>
                              <div className="project-actions">
                                  <a href="/kalkulator" className="btn btn-primary">Åpne applikasjon</a>
                                  <a href="#tech" className="btn btn-outline">Tekniske detaljer</a>
                              </div>
                          </div>
                      </div>
                  </div>
              </div>
          </section>

          <section className="about" id="about">
              <div className="container">
                  <div className="section-header">
                      <h2>Om utvikleren</h2>
                      <div className="section-divider"></div>
                  </div>
                  <div className="about-content">
                      <div className="about-text">
                          <p><span className="highlight-name">Jeg heter Hjalmar</span>, er 18 år og jobber på Coop Extra Gakori ved siden av studiene. Som en person som setter pris på effektivitet og elegante løsninger, ble jeg frustrert over å regne ut lönna mi manuelt hver måned.</p>
                          <p>Dette resulterte i utviklingen av en komplett lönnskalkulator som ikke bare löser mitt problem, men kan hjelpe alle som trenger å regne ut timelønn og overtidstillegg.</p>
                      </div>
                      <div className="about-stats">
                          <div className="stat">
                              <span className="stat-number">18</span>
                              <span className="stat-label">År gammel</span>
                          </div>
                          <div className="stat">
                              <span className="stat-number">1+</span>
                              <span className="stat-label">År erfaring</span>
                          </div>
                          <div className="stat">
                              <span className="stat-number">100%</span>
                              <span className="stat-label">Dedikasjon</span>
                          </div>
                      </div>
                  </div>
              </div>
          </section>

          <section className="tech" id="tech">
              <div className="container">
                  <div className="section-header">
                      <h2>Teknologi & status</h2>
                      <div className="section-divider"></div>
                  </div>
                  <div className="tech-content">
                      <div className="tech-stack">
                          <h3>Teknologier jeg bruker</h3>
                          <div className="tech-grid">
                              <div className="tech-item">
                                  <span className="tech-icon">
                                      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                          <path d="M3 3H21V5H3V3ZM3 7H15V9H3V7ZM3 11H21V13H3V11ZM3 15H15V17H3V15ZM3 19H21V21H3V19Z" fill="currentColor"/>
                                      </svg>
                                  </span>
                                  <span>HTML5 & CSS3</span>
                              </div>
                              <div className="tech-item">
                                  <span className="tech-icon">
                                      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                          <path d="M3 3L5 21L12 23L19 21L21 3H3ZM5.5 7H18.5L18 12H9L9.5 14H17.5L17 18L12 19.5L7 18L6.5 14H8.5L8.75 16L12 17L15.25 16L15.5 13H6L5.5 7Z" fill="currentColor"/>
                                      </svg>
                                  </span>
                                  <span>JavaScript ES6+</span>
                              </div>
                              <div className="tech-item">
                                  <span className="tech-icon">
                                      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                          <path d="M12 2L2 7L12 12L22 7L12 2ZM2 17L12 22L22 17M2 12L12 17L22 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                      </svg>
                                  </span>
                                  <span>Supabase</span>
                              </div>
                              <div className="tech-item">
                                  <span className="tech-icon">
                                      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                          <path d="M18 8C18 6.9 17.1 6 16 6H8C6.9 6 6 6.9 6 8V16C6 17.1 6.9 18 8 18H16C17.1 18 18 17.1 18 16V8ZM16 8V16H8V8H16ZM3 10V14H5V10H3ZM19 10V14H21V10H19Z" fill="currentColor"/>
                                      </svg>
                                  </span>
                                  <span>Authentication</span>
                              </div>
                          </div>
                      </div>
                  </div>
              </div>
          </section>
      </main>
      
      <footer>
          <p>&copy; 2025 Hjalmar Samuel Kristensen-Karlsen</p>
      </footer>
      
      {/* Handle password recovery redirects - commented out for now */}
      {/* 
      <script>
          // Check if this is a password recovery redirect from Supabase
          const hashFragment = window.location.hash;
          const searchParams = window.location.search;
          const urlParams = new URLSearchParams(searchParams);
          const fullUrl = window.location.href;
          
          console.log('Checking for recovery tokens...');
          console.log('Hash:', hashFragment);
          console.log('Search:', searchParams);
          console.log('Full URL:', fullUrl);
          
          // Check for recovery tokens in either hash fragment or query parameters
          const hasRecoveryInHash = hashFragment.includes('access_token') && hashFragment.includes('type=recovery');
          const hasRecoveryInSearch = searchParams.includes('access_token') && searchParams.includes('type=recovery');
          const hasLegacyRecovery = urlParams.has('token') && urlParams.get('type') === 'recovery';
          
          if (hasRecoveryInHash || hasRecoveryInSearch || hasLegacyRecovery) {
              console.log('Recovery tokens detected, redirecting to kalkulator...');
              // Redirect to the kalkulator page with the recovery tokens
              if (hasRecoveryInHash) {
                  window.location.href = '/kalkulator/index.html' + hashFragment;
              } else if (hasRecoveryInSearch) {
                  window.location.href = '/kalkulator/index.html' + searchParams;
              } else if (hasLegacyRecovery) {
                  window.location.href = '/kalkulator/index.html' + searchParams;
              }
          }
      </script>
      */}
    </>
  )
}
