var v=(d,e)=>()=>(e||d((e={exports:{}}).exports,e),e.exports);var E=v((b,u)=>{class k{constructor(){this.messageContainer=null,this.init()}init(){document.readyState==="loading"?document.addEventListener("DOMContentLoaded",()=>this.initContainer()):this.initContainer()}initContainer(){document.querySelector("#error-messages")||this.createMessageContainer(),this.messageContainer=document.querySelector("#error-messages")}createMessageContainer(){const e=document.createElement("div");e.id="error-messages",e.className="message-container",e.setAttribute("aria-live","polite"),e.setAttribute("aria-atomic","true"),document.body.appendChild(e)}getErrorMessages(){return{required:"Dette feltet er påkrevd",email:"Vennligst skriv inn en gyldig e-postadresse",minLength:"Passordet må være minst 8 tegn langt",passwordMismatch:"Passordene stemmer ikke overens",invalidTime:"Vennligst skriv inn en gyldig tid (HH:MM)",invalidDate:"Vennligst velg en gyldig dato",startAfterEnd:"Starttid må være før sluttid",network:"Kunne ikke koble til serveren. Sjekk internettforbindelsen din og prøv igjen.",timeout:"Forespørselen tok for lang tid. Prøv igjen senere.",serverError:"Noe gikk galt på serveren. Prøv igjen om litt.",notFound:"Kunne ikke finne den forespurte ressursen.",unauthorized:"Du har ikke tilgang til denne ressursen. Logg inn på nytt.",forbidden:"Du har ikke tillatelse til å utføre denne handlingen.",saveError:"Kunne ikke lagre endringene. Prøv igjen.",loadError:"Kunne ikke laste data. Oppdater siden og prøv igjen.",deleteError:"Kunne ikke slette elementet. Prøv igjen.",exportError:"Kunne ikke eksportere data. Prøv igjen.",importError:"Kunne ikke importere data. Sjekk at filen er gyldig.",unknown:"En uventet feil oppstod. Prøv igjen eller kontakt support.",retry:"Prøv igjen",contact:"Kontakt support hvis problemet vedvarer"}}showError(e,t={}){const{type:a="error",duration:n=5e3,actionText:i=null,actionCallback:s=null,persistent:r=!1}=t,o=this.formatError(e),l=this.createMessage(o,a,{actionText:i,actionCallback:s,persistent:r});return this.messageContainer.appendChild(l),!r&&n>0&&setTimeout(()=>{this.removeMessage(l)},n),l}showSuccess(e,t={}){return this.showError(e,{...t,type:"success"})}showWarning(e,t={}){return this.showError(e,{...t,type:"warning"})}showInfo(e,t={}){return this.showError(e,{...t,type:"info"})}formatError(e){const t=this.getErrorMessages();return typeof e=="string"?t[e]||e:e instanceof Error?e.message.includes("NetworkError")||e.message.includes("fetch")?t.network:e.message.includes("timeout")?t.timeout:e.status===401||e.message.includes("Unauthorized")?t.unauthorized:e.status===403||e.message.includes("Forbidden")?t.forbidden:e.status===404||e.message.includes("Not Found")?t.notFound:e.status>=500?t.serverError:e.message||t.unknown:t.unknown}createMessage(e,t,a={}){const{actionText:n,actionCallback:i,persistent:s}=a,r=document.createElement("div");r.className=`message message-${t}`,r.setAttribute("role",t==="error"?"alert":"status");const o=document.createElement("div");o.className="message-content";const l=document.createElement("div");l.className="message-icon",l.textContent=this.getIcon(t);const m=document.createElement("div");m.className="message-text",m.textContent=e;const g=document.createElement("div");if(g.className="message-actions",n){const c=document.createElement("button");c.className="message-action",c.setAttribute("aria-label",n),c.textContent=n,g.appendChild(c)}if(!s){const c=document.createElement("button");c.className="message-close",c.setAttribute("aria-label","Lukk melding"),c.textContent="×",g.appendChild(c)}o.appendChild(l),o.appendChild(m),o.appendChild(g),r.appendChild(o);const p=r.querySelector(".message-close");p&&p.addEventListener("click",()=>this.removeMessage(r));const h=r.querySelector(".message-action");return h&&i&&h.addEventListener("click",i),requestAnimationFrame(()=>{r.classList.add("message-enter")}),r}getIcon(e){const t={error:"⚠️",success:"✅",warning:"⚠️",info:"ℹ️"};return t[e]||t.info}removeMessage(e){if(!e||!e.parentNode)return;e.classList.add("message-exit");const t=a=>{a.target===e&&(e.removeEventListener("transitionend",t),e.parentNode&&e.parentNode.removeChild(e))};e.addEventListener("transitionend",t),setTimeout(()=>{e.parentNode&&(e.removeEventListener("transitionend",t),e.parentNode.removeChild(e))},350)}clearAll(){this.messageContainer.querySelectorAll(".message").forEach(t=>this.removeMessage(t))}showFormErrors(e,t){e.querySelectorAll(".form-error").forEach(n=>n.remove()),e.querySelectorAll(".error").forEach(n=>n.classList.remove("error"));const a=this.getErrorMessages();Object.entries(t).forEach(([n,i])=>{const s=e.querySelector(`[name="${n}"], #${n}`);if(s){s.classList.add("error");const r=document.createElement("span");r.className="form-error",r.textContent=a[i]||i,r.setAttribute("role","alert"),s.parentNode.insertBefore(r,s.nextSibling)}})}async handleAsync(e,t={}){const{successMessage:a=null,errorMessage:n=null,showLoading:i=!0,loadingElement:s=null}=t,r=typeof e=="function"?e:()=>e;try{i&&s&&window.LoadingHelper&&window.LoadingHelper.show(s);const o=await r();return a&&this.showSuccess(a),o}catch(o){console.error("Async operation failed:",o);const l=n||this.formatError(o);throw this.showError(l,{actionText:"Prøv igjen",actionCallback:()=>this.handleAsync(r,t)}),o}finally{i&&s&&window.LoadingHelper&&window.LoadingHelper.hide(s)}}}const x=`
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
`;if(!document.querySelector("#error-styles")){const d=document.createElement("style");d.id="error-styles",d.textContent=x,document.head.appendChild(d)}const f=new k;typeof u<"u"&&u.exports?u.exports=f:window.ErrorHelper=f});export default E();
