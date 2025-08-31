import{g as b}from"../kalkulator-C0Bilr8I.js";import"./modulepreload-polyfill-B5Qt9EMX.js";import"./bootstrap-supa-C1PZRnWu.js";import"./supabase-client-C25D-rrn.js";import"./runtime-config-D7xitdne.js";import"./apiBase-C8RWFuli.js";import"./error-handling-BcaxJS6j.js";class x{constructor(){this.modal=null,this.statusEl=null,this.periodEl=null,this.planEl=null,this.currentTier=null,this.isActive=!1,this.beforePaywall=!1}createModal(){if(this.modal)return;const t=document.createElement("div");t.id="subscriptionModal",t.className="modal",t.setAttribute("role","dialog"),t.setAttribute("aria-modal","true"),t.innerHTML=`
      <div class="modal-content subscription-modal-content">
        <div class="modal-header">
          <div class="modal-header-content">
            <h2 class="modal-title">Abonnementsadministrasjon</h2>
            <p class="modal-subtitle">Administrer ditt profesjonelle abonnement</p>
          </div>
          <button type="button" class="modal-close-btn" aria-label="Lukk">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
        
        <!-- Loading state -->
        <div class="modal-loading" id="modalLoading">
          <div class="loading-content">
            <div class="loading-spinner">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M12 2v4m0 12v4M4.93 4.93l2.83 2.83m8.48 8.48l2.83 2.83M2 12h4m12 0h4M4.93 19.07l2.83-2.83m8.48-8.48l2.83-2.83"/>
              </svg>
            </div>
            <p class="loading-text">Henter abonnementsinformasjon...</p>
          </div>
        </div>
        
        <!-- Main content - hidden initially -->
        <div class="modal-body" id="modalContent" style="display: none;">
          <div class="subscription-status-card">
            <div class="status-header">
              <svg class="status-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"></circle>
                <path d="M9 12l2 2 4-4"></path>
              </svg>
              <div id="subscriptionStatus" class="status-text"></div>
            </div>
            <div class="status-details">
              <div id="subscriptionPeriod" class="period-info"></div>
              <div id="subscriptionPlan" class="plan-info"></div>
            </div>
            <div id="subscriptionThanks" class="appreciation-message" style="display:none;">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M12 21s-6.716-4.09-9.193-8.09C.806 10.11 2.292 6 6.07 6c2.097 0 3.34 1.317 3.93 2.26C10.59 7.317 11.833 6 13.93 6c3.777 0 5.263 4.11 3.263 6.91C18.716 16.91 12 21 12 21z"></path>
              </svg>
              <span>Takk for ditt verdsatte partnerskap</span>
            </div>
            <div id="earlyUserAppreciation" class="early-user-message" style="display:none;">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M12 21s-6.716-4.09-9.193-8.09C.806 10.11 2.292 6 6.07 6c2.097 0 3.34 1.317 3.93 2.26C10.59 7.317 11.833 6 13.93 6c3.777 0 5.263 4.11 3.263 6.91C18.716 16.91 12 21 12 21z"></path>
              </svg>
              <div class="early-user-content">
                <h4>Du var her helt fra starten, tusen takk! &lt;3</h4>
                <p>Nyt professional-goder helt gratis. PS. Du kan fortsatt abonnere for å støtte oss.</p>
              </div>
            </div>
            <div id="earlyUserSubscribedThanks" class="early-user-subscribed" style="display:none;">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M12 21s-6.716-4.09-9.193-8.09C.806 10.11 2.292 6 6.07 6c2.097 0 3.34 1.317 3.93 2.26C10.59 7.317 11.833 6 13.93 6c3.777 0 5.263 4.11 3.263 6.91C18.716 16.91 12 21 12 21z"></path>
              </svg>
              <div class="early-user-subscribed-content">
                <h4>Wow! Du var her fra starten, og støtter oss via abonnement i tillegg?! Legende! &lt;3</h4>
                <p>Dette betyr alt for utviklingen av produktet. Tusen takk!</p>
              </div>
            </div>
          </div>
          
          <div class="subscription-plans" id="subscriptionPlans" style="display:none;">
            <h4>Tilgjengelige planer</h4>
            <div class="plans-grid">
              <div class="plan-card free-plan">
                <div class="plan-header">
                  <h5>Gratis</h5>
                  <div class="plan-price">Alltid gratis</div>
                </div>
                <div class="plan-features">
                  <span class="feature">Lagre vakter i én måned</span>
                  <span class="feature">Grunnleggende rapporter</span>
                  <span class="feature">Enkel vaktplanlegging</span>
                  <span class="feature feature-limitation">Kun én måned med vakter om gangen</span>
                </div>
              </div>
              
              <div class="plan-card pro-plan">
                <div class="plan-header">
                  <h5>Professional</h5>
                  <div class="plan-price">Pro-nivå</div>
                </div>
                <div class="plan-features">
                  <span class="feature">Ubegrenset vakter</span>
                  <span class="feature">Alle måneder tilgjengelig</span>
                  <span class="feature">Avanserte rapporter</span>
                  <span class="feature">Prioritert støtte</span>
                </div>
              </div>
              
              <div class="plan-card max-plan">
                <div class="plan-header">
                  <h5>Enterprise</h5>
                  <div class="plan-price">For bedrifter</div>
                </div>
                <div class="plan-features">
                  <span class="feature">Alle Pro-funksjoner</span>
                  <span class="feature">Ansattadministrasjon</span>
                  <span class="feature">Lønnsberegning for ansatte</span>
                  <span class="feature">Avansert rapportering</span>
                  <span class="feature">Dedikert støtte</span>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <!-- Footer - hidden initially -->
        <div class="modal-footer" id="modalFooter" style="display: none;">
          <div class="modal-footer-buttons">
            <button type="button" class="btn btn-secondary" id="upgradeProBtn">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"></path>
              </svg>
              Oppgrader til Professional
            </button>
            <button type="button" class="btn btn-primary" id="upgradeMaxBtn">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"></path>
              </svg>
              Oppgrader til Enterprise
            </button>
            <button type="button" class="btn btn-outline" id="manageSubBtn" style="display:none;">
              Administrer abonnement
            </button>
          </div>
        </div>
      </div>
    `,t.querySelector(".modal-close-btn")?.addEventListener("click",()=>this.hide()),t.addEventListener("click",s=>{s.target===t&&this.hide()}),this.loadingEl=t.querySelector("#modalLoading"),this.contentEl=t.querySelector("#modalContent"),this.footerEl=t.querySelector("#modalFooter"),this.proBtn=t.querySelector("#upgradeProBtn"),this.maxBtn=t.querySelector("#upgradeMaxBtn"),this.manageBtn=t.querySelector("#manageSubBtn"),this.thanksEl=t.querySelector("#subscriptionThanks"),this.plansEl=t.querySelector("#subscriptionPlans"),this.earlyUserEl=t.querySelector("#earlyUserAppreciation"),this.earlyUserSubscribedEl=t.querySelector("#earlyUserSubscribedThanks"),this.loadingEl&&(this.loadingEl.style.display="flex"),this.contentEl&&(this.contentEl.style.display="none"),this.footerEl&&(this.footerEl.style.display="none"),this.proBtn?.addEventListener("click",async()=>{if(!window.startCheckout||!this.proBtn)return;const s=this.proBtn,e=s.disabled;s.disabled=!0,s.setAttribute("aria-busy","true");try{await window.startCheckout("price_1RzQ85Qiotkj8G58AO6st4fh",{mode:"subscription"})}catch{}finally{s.removeAttribute("aria-busy"),s.disabled=e}}),this.maxBtn?.addEventListener("click",async()=>{if(!this.maxBtn)return;const s=this.maxBtn,e=s.disabled;s.disabled=!0,s.setAttribute("aria-busy","true");try{this.currentTier==="pro"&&window.startPortalUpgrade?await window.startPortalUpgrade({redirect:!0}):window.startCheckout&&await window.startCheckout("price_1RzQC1Qiotkj8G58tYo4U5oO",{mode:"subscription"})}catch(r){console.warn("[sub] portal upgrade failed, falling back to billing portal",r);try{this.currentTier==="pro"&&window.startBillingPortal&&await window.startBillingPortal({redirect:!0})}catch{}}finally{s.removeAttribute("aria-busy"),s.disabled=e}}),this.manageBtn?.addEventListener("click",async()=>{try{window.startBillingPortal&&(this.manageBtn.classList.add("loading"),await window.startBillingPortal({redirect:!0}))}finally{this.manageBtn.classList.remove("loading")}}),this.statusEl=t.querySelector("#subscriptionStatus"),this.periodEl=t.querySelector("#subscriptionPeriod"),this.planEl=t.querySelector("#subscriptionPlan"),this.statusIcon=t.querySelector(".status-icon"),document.body.appendChild(t),this.modal=t,this._onSubUpdated=()=>{this.updateFromGlobalState().catch(s=>console.warn("[subscription] update error:",s))},document.addEventListener("subscription:updated",this._onSubUpdated)}async show(){if(this.createModal(),!this.modal)return;this._loadingStartTime=Date.now();const t=document.querySelector(".floating-action-bar"),i=document.querySelector(".floating-action-bar-backdrop");t&&(t.style.display="none"),i&&(i.style.display="none"),this.modal.style.display="flex",this.modal.classList.add("active"),await this.loadSubscription(),window.SubscriptionState&&await this.updateFromGlobalState()}hide(){if(!this.modal)return;this.modal.classList.remove("active"),this.modal.style.display="none";const t=document.querySelector(".floating-action-bar"),i=document.querySelector(".floating-action-bar-backdrop");t&&(t.style.display=""),i&&(i.style.display="")}async showContent(t=350){this._loadingStartTime||(this._loadingStartTime=Date.now());const i=Date.now()-this._loadingStartTime,s=Math.max(0,t-i);s>0&&await new Promise(e=>setTimeout(e,s)),this.loadingEl&&(this.loadingEl.style.display="none"),this.contentEl&&(this.contentEl.style.display="block"),this.footerEl&&(this.footerEl.style.display="block")}async updateFromGlobalState(){if(!this.modal)return;await this.showContent();const t=window.SubscriptionState||null,i=this.beforePaywall;if(console.log("[subscription modal] updateFromGlobalState:",{row:t,beforePaywall:i,currentTier:this.currentTier}),!t){if(i){console.log("[subscription modal] updateFromGlobalState: Early user with no subscription"),this.statusEl&&(this.statusEl.textContent="Early User - Pro-fordeler gratis"),this.periodEl&&(this.periodEl.textContent=""),this.planEl&&(this.planEl.textContent=""),this.thanksEl&&(this.thanksEl.style.display="none"),this.earlyUserSubscribedEl&&(console.log("[subscription modal] updateFromGlobalState: FORCE hiding earlyUserSubscribedEl"),this.earlyUserSubscribedEl.style.display="none"),this.earlyUserEl&&(console.log("[subscription modal] updateFromGlobalState: Setting earlyUserEl to flex"),this.earlyUserEl.style.display="flex"),this.plansEl&&(this.plansEl.style.display="none"),this.manageBtn&&(this.manageBtn.style.display="none"),this.proBtn&&(this.proBtn.style.display=""),this.maxBtn&&(this.maxBtn.style.display=""),this.statusIcon&&(this.statusIcon.style.color="var(--success)"),this.currentTier="free",this.isActive=!0;return}this.statusEl&&(this.statusEl.textContent="Gratis plan"),this.periodEl&&(this.periodEl.textContent="Du kan lagre vakter i én måned om gangen"),this.planEl&&(this.planEl.textContent="Se abonnementene nedenfor. Abonner for tilgang til flere funksjoner!"),this.thanksEl&&(this.thanksEl.style.display="none"),this.earlyUserEl&&(this.earlyUserEl.style.display="none"),this.earlyUserSubscribedEl&&(this.earlyUserSubscribedEl.style.display="none"),this.plansEl&&(this.plansEl.style.display="block"),this.manageBtn&&(this.manageBtn.style.display="none"),this.proBtn&&(this.proBtn.style.display=""),this.maxBtn&&(this.maxBtn.style.display=""),this.statusIcon&&(this.statusIcon.style.color="var(--success)"),this.currentTier="free",this.isActive=!0;return}const s=t.status||"ukjent",e=t.current_period_end,r=typeof e=="number"?new Date(e*1e3):e?new Date(e):null,n=r&&!isNaN(r)?r.toLocaleDateString("no-NO"):null,a=!!t.is_active||t.status==="active",l=String(t.tier||"").toLowerCase(),h=l==="max"?"Enterprise":l?l.charAt(0).toUpperCase()+l.slice(1):null;this.currentTier=l||null,this.isActive=a,this.statusEl&&(this.statusEl.textContent=`${s.charAt(0).toUpperCase()}${s.slice(1)}${h?` - ${h}`:""}`),this.periodEl&&(this.periodEl.textContent=n?`Neste fornyelse: ${n}`:""),this.planEl&&(this.planEl.textContent=h?"Takk for abonnementet!":"");const c=i&&a,p=!i&&a&&l!=="free";this.thanksEl&&(this.thanksEl.style.display="none"),this.earlyUserSubscribedEl&&(this.earlyUserSubscribedEl.style.display="none"),this.earlyUserEl&&(this.earlyUserEl.style.display="none"),c&&this.earlyUserSubscribedEl?(console.log("[subscription modal] updateFromGlobalState: Showing earlyUserSubscribedEl",{beforePaywall:i,isActive:a,tier:l}),this.earlyUserSubscribedEl.style.display="flex"):p&&this.thanksEl&&(console.log("[subscription modal] updateFromGlobalState: Showing regular thanks",{beforePaywall:i,isActive:a,tier:l}),this.thanksEl.style.display="flex"),this.plansEl&&(this.plansEl.style.display=a&&l!=="free"?"none":"block"),this.statusIcon&&(this.statusIcon.style.color=a?"var(--success)":"var(--text-secondary)"),a?l==="free"?(this.manageBtn&&(this.manageBtn.style.display="none"),this.proBtn&&(this.proBtn.style.display=""),this.maxBtn&&(this.maxBtn.style.display="")):l==="pro"?(this.manageBtn&&(this.manageBtn.style.display=""),this.proBtn&&(this.proBtn.style.display="none"),this.maxBtn&&(this.maxBtn.style.display="")):l==="max"?(this.manageBtn&&(this.manageBtn.style.display=""),this.proBtn&&(this.proBtn.style.display="none"),this.maxBtn&&(this.maxBtn.style.display="none")):(this.manageBtn&&(this.manageBtn.style.display=""),this.proBtn&&(this.proBtn.style.display="none"),this.maxBtn&&(this.maxBtn.style.display="none")):(this.manageBtn&&(this.manageBtn.style.display="none"),this.proBtn&&(this.proBtn.style.display=""),this.maxBtn&&(this.maxBtn.style.display=""))}async loadSubscription(){try{if(this.periodEl&&(this.periodEl.textContent=""),!window.supa||!window.supa.auth){await this.showContent(),this.statusEl&&(this.statusEl.textContent="Kunne ikke hente abonnementsinformasjon.");return}const t=await b();if(!t){await this.showContent(),this.statusEl&&(this.statusEl.textContent="Autentisering påkrevd.");return}const[i,s]=await Promise.all([window.supa.from("subscription_tiers").select("status,price_id,tier,is_active,current_period_end,updated_at").eq("user_id",t),window.supa.from("profiles").select("before_paywall").eq("id",t).single()]),{data:e,error:r}=i,n=s.data?.before_paywall===!0;if(this.beforePaywall=n,console.log("[subscription modal] loadSubscription profile data:",n,s.data),console.log("[subscription modal] loadSubscription subscription data:",e,r,Array.isArray(e)&&e.length?e[0]:null),r){console.error("[subscription] fetch error:",r),await this.showContent(),this.statusEl&&(this.statusEl.textContent="Systemfeil - kan ikke hente abonnementsinformasjon.");return}const a=Array.isArray(e)&&e.length?e[0]:null;if(window.CONFIG?.debug&&console.log("[subscription_tiers] raw row:",a),!a){if(await this.showContent(),n){console.log("[subscription modal] Early user with no subscription - showing first message only"),this.statusEl&&(this.statusEl.textContent="Early User - Pro-fordeler gratis"),this.periodEl&&(this.periodEl.textContent=""),this.planEl&&(this.planEl.textContent=""),this.thanksEl&&(this.thanksEl.style.display="none"),this.earlyUserSubscribedEl&&(console.log("[subscription modal] FORCE hiding earlyUserSubscribedEl (should not show for non-subscribers)"),this.earlyUserSubscribedEl.style.display="none"),this.earlyUserEl&&(console.log("[subscription modal] Setting earlyUserEl to flex"),this.earlyUserEl.style.display="flex"),this.plansEl&&(this.plansEl.style.display="none"),this.manageBtn&&(this.manageBtn.style.display="none"),this.proBtn&&(this.proBtn.style.display=""),this.maxBtn&&(this.maxBtn.style.display=""),this.statusIcon&&(this.statusIcon.style.color="var(--success)");return}this.statusEl&&(this.statusEl.textContent="Gratis plan"),this.periodEl&&(this.periodEl.textContent="Du kan lagre vakter i én måned om gangen"),this.planEl&&(this.planEl.textContent="Se abonnementene nedenfor. Abonner for tilgang til flere funksjoner!"),this.thanksEl&&(this.thanksEl.style.display="none"),this.earlyUserEl&&(this.earlyUserEl.style.display="none"),this.earlyUserSubscribedEl&&(this.earlyUserSubscribedEl.style.display="none"),this.plansEl&&(this.plansEl.style.display="block"),this.manageBtn&&(this.manageBtn.style.display="none"),this.proBtn&&(this.proBtn.style.display=""),this.maxBtn&&(this.maxBtn.style.display=""),this.statusIcon&&(this.statusIcon.style.color="var(--success)");return}const l=a.status||"ukjent",h=a.current_period_end,c=typeof h=="number"?new Date(h*1e3):h?new Date(h):null,p=c&&!isNaN(c)?c.toLocaleDateString("no-NO"):null,d=!!a.is_active||a.status==="active",o=String(a.tier||"").toLowerCase(),u=o==="max"?"Enterprise":o?o.charAt(0).toUpperCase()+o.slice(1):null;await this.showContent(),this.currentTier=o||null,console.log("[subscription modal] loadSubscription values:"),console.log("  beforePaywall:",n),console.log("  isActive:",d),console.log("  tier:",o),console.log("  plan:",u),console.log("  raw row:",a),console.log("  showEarlyUserSubscribedMessage:",n&&d),console.log("  showRegularThanks:",!n&&d&&o!=="free"),this.statusEl&&(this.statusEl.textContent=`${l.charAt(0).toUpperCase()}${l.slice(1)}${u?` - ${u}`:""}`),this.periodEl&&(this.periodEl.textContent=p?`Neste fornyelse: ${p}`:""),this.planEl&&(this.planEl.textContent=u?"Takk for abonnementet!":"");const y=n&&d,f=!n&&d&&o!=="free";this.thanksEl&&(this.thanksEl.style.display="none"),this.earlyUserSubscribedEl&&(this.earlyUserSubscribedEl.style.display="none"),this.earlyUserEl&&(this.earlyUserEl.style.display="none"),y&&this.earlyUserSubscribedEl?(console.log("[subscription modal] loadSubscription: Showing earlyUserSubscribedEl",{beforePaywall:n,isActive:d,tier:o}),this.earlyUserSubscribedEl.style.display="flex"):f&&this.thanksEl?(console.log("[subscription modal] loadSubscription: Showing regular thanks",{beforePaywall:n,isActive:d,tier:o}),this.thanksEl.style.display="flex"):(console.log("[subscription modal] loadSubscription: NO MESSAGE SHOWN"),console.log("  showEarlyUserSubscribedMessage:",y),console.log("  showRegularThanks:",f),console.log("  beforePaywall:",n),console.log("  isActive:",d),console.log("  tier:",o),console.log("  hasEarlyUserSubscribedEl:",!!this.earlyUserSubscribedEl),console.log("  hasThanksEl:",!!this.thanksEl)),console.log("[subscription modal] Button logic:"),console.log("  isActive:",d),console.log("  tier:",o),console.log("  beforePaywall:",n),d?o==="free"?(console.log("[subscription modal] Active free tier - showing upgrade buttons"),this.manageBtn&&(this.manageBtn.style.display="none"),this.proBtn&&(this.proBtn.style.display=""),this.maxBtn&&(this.maxBtn.style.display="")):o==="pro"?(console.log("[subscription modal] Active pro tier - showing manage + max upgrade"),this.manageBtn&&(this.manageBtn.style.display=""),this.proBtn&&(this.proBtn.style.display="none"),this.maxBtn&&(this.maxBtn.style.display="")):o==="max"?(console.log("[subscription modal] Active max tier - showing manage only"),this.manageBtn&&(this.manageBtn.style.display=""),this.proBtn&&(this.proBtn.style.display="none"),this.maxBtn&&(this.maxBtn.style.display="none")):(console.log("[subscription modal] Active unknown tier - showing manage only"),this.manageBtn&&(this.manageBtn.style.display=""),this.proBtn&&(this.proBtn.style.display="none"),this.maxBtn&&(this.maxBtn.style.display="none")):(console.log("[subscription modal] Not active - showing upgrade buttons"),this.manageBtn&&(this.manageBtn.style.display="none"),this.proBtn&&(this.proBtn.style.display=""),this.maxBtn&&(this.maxBtn.style.display=""))}catch(t){console.error("[subscription] exception:",t),await this.showContent(),this.statusEl&&(this.statusEl.textContent="Systemfeil - kan ikke hente abonnementsinformasjon."),this.periodEl&&(this.periodEl.textContent="")}}}export{x as SubscriptionModal};
