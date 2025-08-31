class d{constructor(){this.activeLoaders=new Set}show(e,l={}){const t=typeof e=="string"?document.querySelector(e):e;if(!t)return;const{type:o="spinner",text:n="Laster...",preserveSize:s=!0}=l,a=`loader-${Date.now()}-${Math.random().toString(36).substr(2,9)}`;switch(this.activeLoaders.add({element:t,originalContent:t.innerHTML,originalClasses:t.className,loaderId:a}),s&&(t.style.minHeight=t.offsetHeight+"px",t.style.minWidth=t.offsetWidth+"px"),t.classList.add("loading"),t.setAttribute("aria-busy","true"),t.setAttribute("aria-label",n),o){case"spinner":t.innerHTML=this.createSpinner(n);break;case"skeleton":t.innerHTML=this.createSkeleton();break;case"overlay":t.style.position="relative",t.appendChild(this.createOverlay(n));break}return a}hide(e){const l=typeof e=="string"?document.querySelector(e):e;if(!l)return;const t=Array.from(this.activeLoaders).find(o=>o.element===l);if(t){l.innerHTML=t.originalContent,l.className=t.originalClasses,l.removeAttribute("aria-busy"),l.removeAttribute("aria-label"),l.style.minHeight="",l.style.minWidth="";const o=l.querySelector(".loading-overlay");o&&o.remove(),this.activeLoaders.delete(t)}}createSpinner(e){return`
            <div class="loading-spinner" role="status" aria-label="${e}">
                <div class="spinner"></div>
                <span class="loading-text">${e}</span>
            </div>
        `}createSkeleton(){return`
            <div class="skeleton-container">
                <div class="skeleton skeleton-line"></div>
                <div class="skeleton skeleton-line" style="width: 80%;"></div>
                <div class="skeleton skeleton-line" style="width: 60%;"></div>
            </div>
        `}createOverlay(e){const l=document.createElement("div");return l.className="loading-overlay",l.innerHTML=`
            <div class="loading-spinner" role="status" aria-label="${e}">
                <div class="spinner"></div>
                <span class="loading-text">${e}</span>
            </div>
        `,l}async trackPromise(e,l,t={}){this.show(l,t);try{const o=await e;return this.hide(l),o}catch(o){throw this.hide(l),o}}}const c=`
.loading-spinner {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: var(--space-2);
    padding: var(--space-4);
}

.spinner {
    width: 32px;
    height: 32px;
    border: 3px solid var(--border-color);
    border-top: 3px solid var(--primary);
    border-radius: 50%;
    animation: spin 1s linear infinite;
}

.loading-text {
    color: var(--text-secondary);
    font-size: var(--font-size-sm);
}

.loading-overlay {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.5);
    backdrop-filter: blur(2px);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10;
    border-radius: inherit;
}

.skeleton-container {
    padding: var(--space-2);
}

.skeleton-line {
    height: 16px;
    margin-bottom: var(--space-1);
}

.skeleton-line:last-child {
    margin-bottom: 0;
}

@keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
}

/* Reduce motion for accessibility */
@media (prefers-reduced-motion: reduce) {
    .spinner {
        animation: none;
        border-top: 3px solid var(--primary);
    }
}
`;if(!document.querySelector("#loading-styles")){const i=document.createElement("style");i.id="loading-styles",i.textContent=c,document.head.appendChild(i)}const r=new d;typeof module<"u"&&module.exports?module.exports=r:window.LoadingHelper=r;class g{constructor(){this.modal=null,this.isOpen=!1,this.init()}init(){this.createModal(),this.bindEvents(),this.modal&&this.modal.classList.remove("active")}createModal(){this.modal=document.createElement("div"),this.modal.className="legal-modal",this.modal.setAttribute("role","dialog"),this.modal.setAttribute("aria-labelledby","legal-modal-title"),this.modal.setAttribute("aria-modal","true"),this.modal.innerHTML=`
            <div class="legal-modal-overlay"></div>
            <div class="legal-modal-container">
                <div class="legal-modal-header">
                    <h2 id="legal-modal-title">Personvernpolicy & Vilkår</h2>
                    <button class="legal-modal-close" aria-label="Lukk modal">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                    </button>
                </div>
                
                <div class="legal-modal-tabs">
                    <button class="legal-tab active" data-tab="privacy">Personvernpolicy</button>
                    <button class="legal-tab" data-tab="terms">Vilkår og betingelser</button>
                </div>
                
                <div class="legal-modal-content">
                    <div class="legal-tab-content active" id="privacy-content">
                        <div class="legal-content-scroll">
                            <h3>Personvernpolicy</h3>
                            <p><strong>Sist oppdatert:</strong> August 2025</p>
                            
                            <h4>1. Introduksjon</h4>
                            <p>Denne personvernpolicyen beskriver hvordan Lønnskalkulator-applikasjonen ("vi", "vår" eller "oss") samler inn, bruker og beskytter din personlige informasjon når du bruker vår tjeneste.</p>
                            
                            <h4>2. Informasjon vi samler inn</h4>
                            <h5>2.1 Personlig informasjon</h5>
                            <ul>
                                <li><strong>Kontoinformasjon:</strong> E-postadresse, passord og fornavn når du oppretter en konto</li>
                                <li><strong>Profilinformasjon:</strong> Profilbilde (valgfritt), timelønnsønsker og brukerinnstillinger</li>
                                <li><strong>Ansattdata:</strong> Navn, e-postadresser, fødselsdatoer, timelønn og tariffnivåer for ansatte du administrerer</li>
                                <li><strong>Vaktdata:</strong> Arbeidsplaner, start-/sluttider, pauser og lønnsberegninger</li>
                            </ul>
                            
                            <h5>2.2 Teknisk informasjon</h5>
                            <ul>
                                <li><strong>Bruksdata:</strong> Hvordan du samhandler med applikasjonen, funksjoner som brukes og ytelsesmetrikker</li>
                                <li><strong>Enhetsinformasjon:</strong> Nettlesertype, operativsystem og enhetsidentifikatorer</li>
                                <li><strong>Loggdata:</strong> Serverlogger, feilrapporter og revisjonsspor</li>
                            </ul>
                            
                            <h4>3. Hvordan vi bruker din informasjon</h4>
                            <h5>3.1 Hovedformål</h5>
                            <ul>
                                <li><strong>Tjenesteytelse:</strong> For å levere lønnsberegningstjenester og administrere din konto</li>
                                <li><strong>Databehandling:</strong> For å beregne lønn, overtidsbetaling og kompensasjon basert på din input</li>
                                <li><strong>Brukeropplevelse:</strong> For å tilpasse din opplevelse og forbedre våre tjenester</li>
                            </ul>
                            
                            <h4>4. Datalagring og sikkerhet</h4>
                            <ul>
                                <li>Alle data lagres sikkert i Supabase skyinfrastruktur</li>
                                <li>Data behandles i samsvar med EUs databeskyttelsesforskrifter</li>
                                <li>Vi implementerer bransjestandard sikkerhetstiltak for å beskytte din informasjon</li>
                            </ul>
                            
                            <h4>5. Dine rettigheter</h4>
                            <ul>
                                <li>Få tilgang til, oppdater og slett din personlige informasjon</li>
                                <li>Eksporter dine data i standardformater</li>
                                <li>Be om fullstendig sletting av din konto og tilknyttet data</li>
                            </ul>
                            
                            <h4>6. Kontaktinformasjon</h4>
                            <p>For spørsmål om denne personvernpolicyen, kontakt oss på: <strong>kkarlsen06@kkarlsen.art</strong></p>
                        </div>
                    </div>
                    
                    <div class="legal-tab-content" id="terms-content">
                        <div class="legal-content-scroll">
                            <h3>Vilkår og betingelser</h3>
                            <p><strong>Sist oppdatert:</strong> August 2025</p>
                            
                            <h4>1. Godkjenning av vilkår</h4>
                            <p>Ved å få tilgang til og bruke Lønnskalkulator-applikasjonen ("Tjeneste") godtar og samtykker du til å være bundet av vilkårene og bestemmelsene i denne avtalen.</p>
                            
                            <h4>2. Beskrivelse av tjeneste</h4>
                            <p>Lønnskalkulatoren er en webbasert applikasjon som leverer:</p>
                            <ul>
                                <li>Lønnsberegningstjenester basert på arbeidsplaner og tariffavtaler</li>
                                <li>Ansattadministrasjon og vaktsporing</li>
                                <li>Lønnskalkulasjon og rapporteringsfunksjoner</li>
                                <li>Brukerkontoadministrasjon og datalagring</li>
                            </ul>
                            
                            <h4>3. Brukerkontoer og registrering</h4>
                            <ul>
                                <li>Du må oppgi nøyaktig, oppdatert og fullstendig informasjon under registrering</li>
                                <li>Du er ansvarlig for å opprettholde konfidensialiteten til dine kontotilganger</li>
                                <li>Du må være minst 13 år gammel for å opprette en konto</li>
                            </ul>
                            
                            <h4>4. Akseptabel bruk</h4>
                            <h5>4.1 Tillatte bruksområder</h5>
                            <ul>
                                <li>Personlige lønnsberegninger og ansattadministrasjon</li>
                                <li>Forretningsbruk for administrasjon av ansattlønn</li>
                                <li>Utdannings- og forskningsformål</li>
                            </ul>
                            
                            <h5>4.2 Forbudte bruksområder</h5>
                            <ul>
                                <li>Forsøk på å få uautorisert tilgang til systemet</li>
                                <li>Bruk av tjenesten til ulovlige eller svindelaktige aktiviteter</li>
                                <li>Forstyrrelse av tjenestens drift eller andre brukeres tilgang</li>
                            </ul>
                            
                            <h4>5. Tjenestebegrensninger</h4>
                            <ul>
                                <li>Tjenesten leveres "som den er" uten garantier av noe slag</li>
                                <li>Vi garanterer ikke nøyaktigheten av beregninger eller resultater</li>
                                <li>Vi er ikke ansvarlige for eventuelle tap relatert til lønnsberegninger eller forretningsbeslutninger</li>
                            </ul>
                            
                            <h4>6. Kontaktinformasjon</h4>
                            <p>For spørsmål om disse vilkårene, kontakt oss på: <strong>kkarlsen06@kkarlsen.art</strong></p>
                        </div>
                    </div>
                </div>
                
                <div class="legal-modal-footer">
                    <button class="btn btn-primary legal-modal-accept" id="legal-accept-btn">Jeg godtar</button>
                    <button class="btn btn-secondary legal-modal-decline" id="legal-decline-btn">Avslå</button>
                </div>
            </div>
        `,document.body.appendChild(this.modal)}bindEvents(){this.modal.querySelector(".legal-modal-close").addEventListener("click",()=>this.close()),this.modal.querySelector(".legal-modal-overlay").addEventListener("click",()=>this.close()),this.modal.querySelectorAll(".legal-tab").forEach(s=>{s.addEventListener("click",a=>this.switchTab(a.target.dataset.tab))});const o=this.modal.querySelector("#legal-accept-btn"),n=this.modal.querySelector("#legal-decline-btn");o&&o.addEventListener("click",()=>this.accept()),n&&n.addEventListener("click",()=>this.decline()),document.addEventListener("keydown",s=>{s.key==="Escape"&&this.isOpen&&this.close()})}switchTab(e){const l=this.modal.querySelectorAll(".legal-tab"),t=this.modal.querySelectorAll(".legal-tab-content");l.forEach(s=>s.classList.remove("active")),t.forEach(s=>s.classList.remove("active"));const o=this.modal.querySelector(`[data-tab="${e}"]`),n=this.modal.querySelector(`#${e}-content`);o&&o.classList.add("active"),n&&n.classList.add("active")}open(){console.log("open() called");const e=window.location.pathname.includes("login.html");e||window.scrollTo({top:0,behavior:"smooth"}),setTimeout(()=>{this.modal.classList.add("active"),this.isOpen=!0,document.body.style.overflow="hidden",console.log("Modal opened with active class"),setTimeout(()=>{this.modal.querySelector(".legal-modal-close").focus()},100)},e?0:300)}close(){this.modal.classList.remove("active"),this.isOpen=!1,document.body.style.overflow="",this.modal.classList.remove("landing-page")}accept(){const e=new CustomEvent("legalAccepted",{detail:{accepted:!0}});document.dispatchEvent(e),this.close()}decline(){const e=new CustomEvent("legalDeclined",{detail:{accepted:!1}});document.dispatchEvent(e),this.close()}showInfo(){console.log("showInfo called");const e=this.modal.querySelector(".legal-modal-footer");e&&(e.style.display="none",console.log("Footer hidden in showInfo")),this.open()}showConsent(){const e=this.modal.querySelector(".legal-modal-footer");e&&(e.style.display="flex"),this.open()}showFromLandingPage(){console.log("showFromLandingPage called");const e=this.modal.querySelector(".legal-modal-footer");e&&(e.style.display="none",console.log("Footer hidden")),this.modal.classList.add("landing-page"),(window.pageYOffset||document.documentElement.scrollTop)>100?(window.scrollTo({top:0,behavior:"smooth"}),setTimeout(()=>{this.showModalAfterScroll()},400)):this.showModalAfterScroll()}showModalAfterScroll(){this.modal.classList.add("active"),this.isOpen=!0,document.body.style.overflow="hidden",setTimeout(()=>{this.modal.querySelector(".legal-modal-close").focus()},150)}destroy(){this.modal&&this.modal.parentNode&&this.modal.parentNode.removeChild(this.modal)}}export{g as L};
