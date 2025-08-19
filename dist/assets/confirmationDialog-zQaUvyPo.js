class h{constructor(){this.isVisible=!1,this.currentResolve=null,this.modal=null,this.handleConfirm=this.handleConfirm.bind(this),this.handleCancel=this.handleCancel.bind(this),this.handleKeyDown=this.handleKeyDown.bind(this),this.handleClickOutside=this.handleClickOutside.bind(this)}async show(e={}){const{title:t="Bekreft handling",message:s="Er du sikker?",confirmText:o="Bekreft",cancelText:l="Avbryt",type:i="danger"}=e;return new Promise(n=>{this.currentResolve=n,this.createDialog(t,s,o,l,i),this.attachEventListeners(),this.isVisible=!0})}hide(){this.isVisible&&(this.removeEventListeners(),this.modal&&(this.modal.classList.remove("active"),setTimeout(()=>{this.modal&&this.modal.parentNode&&this.modal.remove(),this.modal=null},300)),this.isVisible=!1)}createDialog(e,t,s,o,l){const i=document.getElementById("confirmationDialog");i&&i.remove(),this.modal=document.createElement("div"),this.modal.id="confirmationDialog",this.modal.className="modal confirmation-modal",this.modal.innerHTML=this.getDialogHTML(l);const n=this.modal.querySelector(".confirmation-title"),a=this.modal.querySelector(".confirmation-message"),c=this.modal.querySelector(".cancel-btn"),d=this.modal.querySelector(".confirm-btn");n&&(n.textContent=e),a&&(a.textContent=t),c&&(c.textContent=o),d&&(d.textContent=s),document.body.appendChild(this.modal),setTimeout(()=>{this.modal.classList.add("active")},10)}getDialogHTML(e){const t=this.getIconSVG(e);return`
            <div class="modal-content confirmation-content ${e}">
                <div class="confirmation-header">
                    <div class="confirmation-icon ${e}">
                        ${t}
                    </div>
                    <h3 class="confirmation-title"></h3>
                </div>

                <div class="confirmation-body">
                    <p class="confirmation-message"></p>
                </div>

                <div class="confirmation-footer">
                    <button type="button" class="btn btn-secondary cancel-btn"></button>
                    <button type="button" class="btn btn-${e} confirm-btn"></button>
                </div>
            </div>
        `}getIconSVG(e){switch(e){case"danger":return`
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <circle cx="12" cy="12" r="10"></circle>
                        <line x1="15" y1="9" x2="9" y2="15"></line>
                        <line x1="9" y1="9" x2="15" y2="15"></line>
                    </svg>
                `;case"warning":return`
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                        <line x1="12" y1="9" x2="12" y2="13"></line>
                        <line x1="12" y1="17" x2="12.01" y2="17"></line>
                    </svg>
                `;case"info":return`
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <circle cx="12" cy="12" r="10"></circle>
                        <line x1="12" y1="16" x2="12" y2="12"></line>
                        <line x1="12" y1="8" x2="12.01" y2="8"></line>
                    </svg>
                `;default:return""}}attachEventListeners(){if(!this.modal)return;const e=this.modal.querySelector(".confirm-btn"),t=this.modal.querySelector(".cancel-btn");e&&e.addEventListener("click",this.handleConfirm),t&&t.addEventListener("click",this.handleCancel),document.addEventListener("keydown",this.handleKeyDown),this.modal.addEventListener("click",this.handleClickOutside),setTimeout(()=>{e&&e.focus()},100)}removeEventListeners(){document.removeEventListener("keydown",this.handleKeyDown),this.modal&&this.modal.removeEventListener("click",this.handleClickOutside)}handleConfirm(){this.hide(),this.currentResolve&&(this.currentResolve(!0),this.currentResolve=null)}handleCancel(){this.hide(),this.currentResolve&&(this.currentResolve(!1),this.currentResolve=null)}handleKeyDown(e){if(this.isVisible)switch(e.key){case"Escape":e.preventDefault(),this.handleCancel();break;case"Enter":e.preventDefault(),this.handleConfirm();break}}handleClickOutside(e){e.target===this.modal&&this.handleCancel()}}const m=new h,u=r=>m.show({title:"Arkiver ansatt",message:`Er du sikker på at du vil arkivere ${r}?

Arkiverte ansatte vil ikke vises i listen, men historiske data bevares. Du kan gjenopprette ansatte senere hvis nødvendig.`,confirmText:"Arkiver",cancelText:"Avbryt",type:"warning"});export{h as ConfirmationDialog,u as confirmArchive,m as confirmationDialog};
