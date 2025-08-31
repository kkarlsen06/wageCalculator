import{SubscriptionModal as c}from"./subscriptionModal-vtNCg7aA.js";import{deleteShiftsOutsideMonth as h}from"./subscriptionValidator-DK7NINq5.js";import{ConfirmationDialog as m}from"./confirmationDialog-zQaUvyPo.js";import"../kalkulator-C0Bilr8I.js";import"./modulepreload-polyfill-B5Qt9EMX.js";import"./bootstrap-supa-C1PZRnWu.js";import"./supabase-client-C25D-rrn.js";import"./runtime-config-D7xitdne.js";import"./apiBase-C8RWFuli.js";import"./error-handling-BcaxJS6j.js";class a{constructor(){this.modal=null,this.subscriptionModal=null,this.confirmationDialog=null,this.currentResolve=null,this.isVisible=!1,this.currentMonth=null}async show(t={}){const{otherMonths:i=[],currentMonth:e}=t;return this.currentMonth=e,new Promise(s=>{this.currentResolve=s,this.createModal(i,e),this.attachEventListeners(),this.isVisible=!0})}createModal(t,i){this.modal&&this.modal.remove();const e=document.createElement("div");e.className="modal premium-feature-modal",e.setAttribute("role","dialog"),e.setAttribute("aria-modal","true");const s={"01":"januar","02":"februar","03":"mars","04":"april","05":"mai","06":"juni","07":"juli","08":"august","09":"september",10:"oktober",11:"november",12:"desember"},n=r=>{const[l,d]=r.split("-");return`${s[d]} ${l}`},o=t.map(r=>`<li class="month-item">${n(r)}</li>`).join("");e.innerHTML=`
      <div class="modal-content premium-feature-content">
        <div class="modal-header">
          <div class="premium-icon">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"></path>
            </svg>
          </div>
          <h2 class="modal-title">Premium-funksjon</h2>
        </div>
        
        <div class="modal-description">
          <p>Du har funnet en premium-funksjon. Oppgrader til et abonnement eller slett alle vakter i de andre månedene.</p>
        </div>
        
        <div class="modal-body">
          <div class="limitation-info">
            <div class="info-card">
              <div class="info-header">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="12" y1="8" x2="12" y2="12"></line>
                  <line x1="12" y1="16" x2="12.01" y2="16"></line>
                </svg>
                <span>Gratis-plan begrensning</span>
              </div>
              <p>Gratis-planen tillater kun vakter i én måned om gangen. Du har allerede vakter i:</p>
              <ul class="months-list">
                ${o}
              </ul>
            </div>
          </div>
        </div>
        
        <div class="modal-footer">
          <div class="modal-footer-buttons">
            <button type="button" class="btn btn-outline" id="cancelBtn">
              Avbryt
            </button>
            <button type="button" class="btn btn-secondary" id="deleteShiftsBtn">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="3,6 5,6 21,6"></polyline>
                <path d="m19,6v14a2,2 0 0,1 -2,2H7a2,2 0 0,1 -2,-2V6m3,0V4a2,2 0 0,1 2,-2h4a2,2 0 0,1 2,2v2"></path>
                <line x1="10" y1="11" x2="10" y2="17"></line>
                <line x1="14" y1="11" x2="14" y2="17"></line>
              </svg>
              Slett andre
            </button>
            <button type="button" class="btn btn-primary" id="upgradeBtn">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"></path>
              </svg>
              Oppgrader
            </button>
          </div>
        </div>
      </div>
    `,document.body.appendChild(e),this.modal=e,requestAnimationFrame(()=>{e.classList.add("active")})}attachEventListeners(){if(!this.modal)return;const t=this.modal.querySelector("#cancelBtn"),i=this.modal.querySelector("#deleteShiftsBtn"),e=this.modal.querySelector("#upgradeBtn");t?.addEventListener("click",()=>{this.resolve("cancel")}),i?.addEventListener("click",async()=>{await this.handleDeleteShifts()}),e?.addEventListener("click",()=>{this.handleUpgrade()}),this.modal.addEventListener("click",s=>{s.target===this.modal&&this.resolve("cancel")}),document.addEventListener("keydown",this.handleKeyDown)}handleKeyDown=t=>{t.key==="Escape"&&this.isVisible&&this.resolve("cancel")};async handleDeleteShifts(){if(this.confirmationDialog||(this.confirmationDialog=new m),await this.confirmationDialog.show({title:"Slett vakter",message:"Er du sikker på at du vil slette alle vakter i de andre månedene? Denne handlingen kan ikke angres.",confirmText:"Ja, slett vaktene",cancelText:"Avbryt",type:"danger"}))try{const i=this.currentMonth;if(!i){console.error("Current month not available for deletion");return}const e=await h(i);if(e.success){const s=e.deletedCount===1?"Slettet 1 vakt i andre måneder":`Slettet ${e.deletedCount} vakter i andre måneder`;if(console.log(s),window.app&&window.app.refreshUI)try{await this.reloadUserShifts()}catch(n){console.error("Failed to reload shifts after deletion:",n)}this.resolve("delete_completed")}else console.error("Failed to delete shifts:",e.error),alert("Kunne ikke slette vakter. Prøv igjen.")}catch(i){console.error("Error deleting shifts:",i),alert("Systemfeil ved sletting av vakter.")}}handleUpgrade(){this.resolve("upgrade")}async reloadUserShifts(){try{const{data:{session:t}}=await window.supa.auth.getSession();if(!t){console.warn("No session available for refreshing shifts");return}const i=await fetch(`${window.CONFIG.apiBase}/shifts`,{method:"GET",headers:{Authorization:`Bearer ${t.access_token}`,"Content-Type":"application/json"}});if(!i.ok)throw new Error(`HTTP error! status: ${i.status}`);const n=((await i.json()).shifts||[]).map(o=>({id:o.id,date:new Date(o.shift_date),startTime:o.start_time,endTime:o.end_time,shiftType:o.shift_type||"regular",employee_id:o.employee_id||null}));window.app&&(window.app.userShifts=[...n],window.app.shifts=[...n],window.app.refreshUI(n)),console.log(`Reloaded ${n.length} shifts after deletion`)}catch(t){throw console.error("Error reloading user shifts:",t),t}}resolve(t){this.isVisible&&(this.isVisible=!1,this.hide(),this.currentResolve&&(this.currentResolve(t),this.currentResolve=null))}hide(){this.modal&&(this.modal.classList.remove("active"),document.removeEventListener("keydown",this.handleKeyDown),setTimeout(()=>{this.modal&&(this.modal.remove(),this.modal=null)},300))}static async showAndHandle(t={}){const i=new a;switch(await i.show(t)){case"upgrade":return i.subscriptionModal||(i.subscriptionModal=new c),await i.subscriptionModal.show(),!1;case"delete_completed":return!0;case"cancel":default:return!1}}}export{a as PremiumFeatureModal};
