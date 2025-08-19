var y=(l,e)=>()=>(e||l((e={exports:{}}).exports,e),e.exports);var E=y((L,g)=>{class k{constructor(){this.activeLoaders=new Set}show(e,t={}){const r=typeof e=="string"?document.querySelector(e):e;if(!r)return;const{type:n="spinner",text:a="Laster...",preserveSize:i=!0}=t,s=`loader-${Date.now()}-${Math.random().toString(36).substr(2,9)}`;switch(this.activeLoaders.add({element:r,originalContent:r.innerHTML,originalClasses:r.className,loaderId:s}),i&&(r.style.minHeight=r.offsetHeight+"px",r.style.minWidth=r.offsetWidth+"px"),r.classList.add("loading"),r.setAttribute("aria-busy","true"),r.setAttribute("aria-label",a),n){case"spinner":r.innerHTML=this.createSpinner(a);break;case"skeleton":r.innerHTML=this.createSkeleton();break;case"overlay":r.style.position="relative",r.appendChild(this.createOverlay(a));break}return s}hide(e){const t=typeof e=="string"?document.querySelector(e):e;if(!t)return;const r=Array.from(this.activeLoaders).find(n=>n.element===t);if(r){t.innerHTML=r.originalContent,t.className=r.originalClasses,t.removeAttribute("aria-busy"),t.removeAttribute("aria-label"),t.style.minHeight="",t.style.minWidth="";const n=t.querySelector(".loading-overlay");n&&n.remove(),this.activeLoaders.delete(r)}}createSpinner(e){return`
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
        `}createOverlay(e){const t=document.createElement("div");return t.className="loading-overlay",t.innerHTML=`
            <div class="loading-spinner" role="status" aria-label="${e}">
                <div class="spinner"></div>
                <span class="loading-text">${e}</span>
            </div>
        `,t}async trackPromise(e,t,r={}){this.show(t,r);try{const n=await e;return this.hide(t),n}catch(n){throw this.hide(t),n}}}const x=`
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
`;if(!document.querySelector("#loading-styles")){const l=document.createElement("style");l.id="loading-styles",l.textContent=x,document.head.appendChild(l)}const v=new k;typeof g<"u"&&g.exports?g.exports=v:window.LoadingHelper=v;class b{constructor(){this.messageContainer=null,this.init()}init(){document.readyState==="loading"?document.addEventListener("DOMContentLoaded",()=>this.initContainer()):this.initContainer()}initContainer(){document.querySelector("#error-messages")||this.createMessageContainer(),this.messageContainer=document.querySelector("#error-messages")}createMessageContainer(){const e=document.createElement("div");e.id="error-messages",e.className="message-container",e.setAttribute("aria-live","polite"),e.setAttribute("aria-atomic","true"),document.body.appendChild(e)}getErrorMessages(){return{required:"Dette feltet er påkrevd",email:"Vennligst skriv inn en gyldig e-postadresse",minLength:"Passordet må være minst 8 tegn langt",passwordMismatch:"Passordene stemmer ikke overens",invalidTime:"Vennligst skriv inn en gyldig tid (HH:MM)",invalidDate:"Vennligst velg en gyldig dato",startAfterEnd:"Starttid må være før sluttid",network:"Kunne ikke koble til serveren. Sjekk internettforbindelsen din og prøv igjen.",timeout:"Forespørselen tok for lang tid. Prøv igjen senere.",serverError:"Noe gikk galt på serveren. Prøv igjen om litt.",notFound:"Kunne ikke finne den forespurte ressursen.",unauthorized:"Du har ikke tilgang til denne ressursen. Logg inn på nytt.",forbidden:"Du har ikke tillatelse til å utføre denne handlingen.",saveError:"Kunne ikke lagre endringene. Prøv igjen.",loadError:"Kunne ikke laste data. Oppdater siden og prøv igjen.",deleteError:"Kunne ikke slette elementet. Prøv igjen.",exportError:"Kunne ikke eksportere data. Prøv igjen.",importError:"Kunne ikke importere data. Sjekk at filen er gyldig.",unknown:"En uventet feil oppstod. Prøv igjen eller kontakt support.",retry:"Prøv igjen",contact:"Kontakt support hvis problemet vedvarer"}}showError(e,t={}){const{type:r="error",duration:n=5e3,actionText:a=null,actionCallback:i=null,persistent:s=!1}=t,o=this.formatError(e),d=this.createMessage(o,r,{actionText:a,actionCallback:i,persistent:s});return this.messageContainer.appendChild(d),!s&&n>0&&setTimeout(()=>{this.removeMessage(d)},n),d}showSuccess(e,t={}){return this.showError(e,{...t,type:"success"})}showWarning(e,t={}){return this.showError(e,{...t,type:"warning"})}showInfo(e,t={}){return this.showError(e,{...t,type:"info"})}formatError(e){const t=this.getErrorMessages();return typeof e=="string"?t[e]||e:e instanceof Error?e.message.includes("NetworkError")||e.message.includes("fetch")?t.network:e.message.includes("timeout")?t.timeout:e.status===401||e.message.includes("Unauthorized")?t.unauthorized:e.status===403||e.message.includes("Forbidden")?t.forbidden:e.status===404||e.message.includes("Not Found")?t.notFound:e.status>=500?t.serverError:e.message||t.unknown:t.unknown}createMessage(e,t,r={}){const{actionText:n,actionCallback:a,persistent:i}=r,s=document.createElement("div");s.className=`message message-${t}`,s.setAttribute("role",t==="error"?"alert":"status");const o=document.createElement("div");o.className="message-content";const d=document.createElement("div");d.className="message-icon",d.textContent=this.getIcon(t);const p=document.createElement("div");p.className="message-text",p.textContent=e;const u=document.createElement("div");if(u.className="message-actions",n){const c=document.createElement("button");c.className="message-action",c.setAttribute("aria-label",n),c.textContent=n,u.appendChild(c)}if(!i){const c=document.createElement("button");c.className="message-close",c.setAttribute("aria-label","Lukk melding"),c.textContent="×",u.appendChild(c)}o.appendChild(d),o.appendChild(p),o.appendChild(u),s.appendChild(o);const m=s.querySelector(".message-close");m&&m.addEventListener("click",()=>this.removeMessage(s));const h=s.querySelector(".message-action");return h&&a&&h.addEventListener("click",a),requestAnimationFrame(()=>{s.classList.add("message-enter")}),s}getIcon(e){const t={error:"⚠️",success:"✅",warning:"⚠️",info:"ℹ️"};return t[e]||t.info}removeMessage(e){if(!e||!e.parentNode)return;e.classList.add("message-exit");const t=r=>{r.target===e&&(e.removeEventListener("transitionend",t),e.parentNode&&e.parentNode.removeChild(e))};e.addEventListener("transitionend",t),setTimeout(()=>{e.parentNode&&(e.removeEventListener("transitionend",t),e.parentNode.removeChild(e))},350)}clearAll(){this.messageContainer.querySelectorAll(".message").forEach(t=>this.removeMessage(t))}showFormErrors(e,t){e.querySelectorAll(".form-error").forEach(n=>n.remove()),e.querySelectorAll(".error").forEach(n=>n.classList.remove("error"));const r=this.getErrorMessages();Object.entries(t).forEach(([n,a])=>{const i=e.querySelector(`[name="${n}"], #${n}`);if(i){i.classList.add("error");const s=document.createElement("span");s.className="form-error",s.textContent=r[a]||a,s.setAttribute("role","alert"),i.parentNode.insertBefore(s,i.nextSibling)}})}async handleAsync(e,t={}){const{successMessage:r=null,errorMessage:n=null,showLoading:a=!0,loadingElement:i=null}=t,s=typeof e=="function"?e:()=>e;try{a&&i&&window.LoadingHelper&&window.LoadingHelper.show(i);const o=await s();return r&&this.showSuccess(r),o}catch(o){console.error("Async operation failed:",o);const d=n||this.formatError(o);throw this.showError(d,{actionText:"Prøv igjen",actionCallback:()=>this.handleAsync(s,t)}),o}finally{a&&i&&window.LoadingHelper&&window.LoadingHelper.hide(i)}}}const w=`
.message-container {
    position: fixed;
    top: 20px;
    right: 20px;
    z-index: 9999;
    max-width: 400px;
    pointer-events: none;
}

.message {
    background: var(--bg-card);
    border: 1px solid var(--border-color);
    border-radius: 8px;
    margin-bottom: var(--space-2);
    opacity: 0;
    transform: translateX(100%);
    transition: all 0.3s ease;
    pointer-events: auto;
    box-shadow: var(--shadow-lg);
}

.message-enter {
    opacity: 1;
    transform: translateX(0);
}

.message-exit {
    opacity: 0;
    transform: translateX(100%);
}

.message-error {
    border-left: 4px solid var(--error);
}

.message-success {
    border-left: 4px solid var(--success);
}

.message-warning {
    border-left: 4px solid var(--warning);
}

.message-info {
    border-left: 4px solid var(--info);
}

.message-content {
    display: flex;
    align-items: flex-start;
    padding: var(--space-3);
    gap: var(--space-2);
}

.message-icon {
    font-size: 18px;
    flex-shrink: 0;
}

.message-text {
    flex: 1;
    color: var(--text-primary);
    line-height: 1.4;
}

.message-actions {
    display: flex;
    gap: var(--space-1);
    flex-shrink: 0;
}

.message-action, .message-close {
    background: none;
    border: none;
    color: var(--text-secondary);
    cursor: pointer;
    padding: 4px 8px;
    border-radius: 4px;
    font-size: 12px;
    transition: all 150ms ease;
}

.message-action:hover, .message-close:hover {
    background: var(--bg-hover);
    color: var(--text-primary);
}

.message-close {
    font-size: 16px;
    line-height: 1;
}

.form-error {
    color: var(--error);
    font-size: var(--font-size-sm);
    margin-top: var(--space-1);
    display: block;
}

@media (max-width: 768px) {
    .message-container {
        left: 10px;
        right: 10px;
        top: 10px;
        max-width: none;
    }
}
`;if(!document.querySelector("#error-styles")){const l=document.createElement("style");l.id="error-styles",l.textContent=w,document.head.appendChild(l)}const f=new b;typeof g<"u"&&g.exports?g.exports=f:window.ErrorHelper=f});export default E();
