const __vite__mapDeps=(i,m=__vite__mapDeps,d=(m.f||(m.f=["assets/employeeActionsMenu-BIlwAg25.js","assets/kalkulator-DBxLsLDQ.js","assets/modulepreload-polyfill-B5Qt9EMX.js","assets/runtime-config-DrxMV8iP.js","assets/kalkulator-Cgb6LfEK.css","assets/employeeModal-BeJwqHKx.js"])))=>i.map(i=>d[i]);
import{_ as r}from"./kalkulator-DBxLsLDQ.js";import"./modulepreload-polyfill-B5Qt9EMX.js";import"./runtime-config-DrxMV8iP.js";class u{constructor(e,t){this.container=e,this.app=t,this.isInitialized=!1,this.touchStartX=0,this.touchStartY=0,this.isDragging=!1,this.scrollStartX=0,this.longPressTimer=null,this.longPressThreshold=500,this.renderCache=new Map,this.lastRenderKey="",this.virtualizationThreshold=30,this.visibleRange={start:0,end:20},this.itemWidth=80,this.isVirtualized=!1,this.isMobile=window.innerWidth<=768,this.touchThreshold=10,this.init()}init(){this.isInitialized||(this.createCarouselStructure(),this.attachEventListeners(),this.isInitialized=!0,this.render())}createCarouselStructure(){this.container.innerHTML=`
            <div class="employee-carousel" role="tablist" aria-label="Velg ansatt">
                <div class="carousel-instructions sr-only" aria-live="polite" id="carouselInstructions">
                    Bruk piltastene for å navigere mellom ansatte. Trykk Enter eller mellomrom for å velge. Trykk og hold eller bruk Shift+F10 for handlingsmeny.
                </div>
                <div class="carousel-edge-blur left" aria-hidden="true" style="display: none;"></div>
                <button class="carousel-arrow carousel-arrow-left" aria-label="Scroll venstre" style="display: none;">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="15 18 9 12 15 6"></polyline>
                    </svg>
                </button>
                <div class="employee-carousel-track" id="employeeCarouselTrack"
                     aria-describedby="carouselInstructions">
                    <!-- Employee tiles will be rendered here -->
                </div>
                <button class="carousel-arrow carousel-arrow-right" aria-label="Scroll høyre" style="display: none;">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="9 18 15 12 9 6"></polyline>
                    </svg>
                </button>
                <div class="carousel-edge-blur right" aria-hidden="true" style="display: none;"></div>
                <div class="carousel-status sr-only" aria-live="polite" id="carouselStatus">
                    <!-- Status updates will be announced here -->
                </div>
            </div>
        `,this.track=this.container.querySelector(".employee-carousel-track"),this.statusElement=this.container.querySelector("#carouselStatus"),this.leftArrow=this.container.querySelector(".carousel-arrow-left"),this.rightArrow=this.container.querySelector(".carousel-arrow-right"),this.leftEdgeBlur=this.container.querySelector(".carousel-edge-blur.left"),this.rightEdgeBlur=this.container.querySelector(".carousel-edge-blur.right")}attachEventListeners(){this.track.addEventListener("touchstart",this.handleTouchStart.bind(this),{passive:!0}),this.track.addEventListener("touchend",this.handleTouchEnd.bind(this),{passive:!0}),this.track.addEventListener("wheel",e=>{Math.abs(e.deltaX)>Math.abs(e.deltaY)?(e.preventDefault(),this.track.scrollLeft+=e.deltaX):Math.abs(e.deltaY)>Math.abs(e.deltaX)&&(e.preventDefault(),this.track.scrollLeft+=e.deltaY)},{passive:!1}),this.track.addEventListener("click",e=>{const t=e.target.closest(".employee-tile");if(t)if(e.preventDefault(),e.stopPropagation(),t.dataset.action==="add")try{console.debug("[employees] add-click"),this.handleAddEmployee()}catch(i){console.error("Add employee click handler failed:",i)}else this.handleTileClick(t)}),this.track.addEventListener("keydown",this.handleKeyDown.bind(this)),this.track.addEventListener("focus",this.handleFocus.bind(this),!0),this.track.addEventListener("scroll",this.handleScroll.bind(this),{passive:!0}),this.leftArrow&&this.rightArrow&&(this.leftArrow.addEventListener("click",()=>{this.track.scrollBy({left:-200,behavior:"smooth"})}),this.rightArrow.addEventListener("click",()=>{this.track.scrollBy({left:200,behavior:"smooth"})})),window.addEventListener("resize",this.handleResize.bind(this),{passive:!0}),this.track.addEventListener("contextmenu",e=>e.preventDefault())}async render(){try{const e=this.generateRenderKey();if(e===this.lastRenderKey&&this.renderCache.has(e)){this.track.innerHTML=this.renderCache.get(e),this.updateActiveStates();return}this.showLoadingState(),this.announceLoading();const t=await this.createEmployeeTiles(),i=this.createAddTile(),s=t+i;this.renderCache.set(e,s),this.lastRenderKey=e,this.track.innerHTML=s,this.updateActiveStates(),this.updateFocusManagement(),this.scrollToActiveItem(),this.updateArrowVisibility();const a=this.app.employees.length;this.announceSelection(`${a} ansatte lastet`)}catch(e){console.error("Error rendering employee carousel:",e),this.showErrorState(),this.announceError()}}generateRenderKey(){const e=this.app.employees.map(i=>i.id).sort().join(","),t=this.app.selectedEmployeeId||"none";return`${e}_${t}_${this.app.employees.length}`}createAllTile(){const e=this.app.isAllEmployeesSelected();return`
            <div class="employee-tile ${e?"active":""}" 
                 data-employee-id="all" 
                 role="tab" 
                 tabindex="${e?"0":"-1"}"
                 aria-selected="${e}"
                 aria-label="Alle ansatte">
                <div class="employee-avatar all-avatar">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                        <circle cx="9" cy="7" r="4"></circle>
                        <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                        <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                    </svg>
                </div>
                <div class="employee-name">Alle</div>
            </div>
        `}async createEmployeeTiles(){return!this.app.employees||this.app.employees.length===0?"":(this.isVirtualized=this.app.employees.length>this.virtualizationThreshold,this.isVirtualized?await this.createVirtualizedEmployeeTiles():(await Promise.all(this.app.employees.map(t=>this.createEmployeeTile(t)))).join(""))}async createVirtualizedEmployeeTiles(){const{start:e,end:t}=this.visibleRange,i=this.app.employees.slice(e,t),s=e>0?`<div class="carousel-spacer" style="width: ${e*this.itemWidth}px;"></div>`:"",a=t<this.app.employees.length?`<div class="carousel-spacer" style="width: ${(this.app.employees.length-t)*this.itemWidth}px;"></div>`:"",l=await Promise.all(i.map(o=>this.createEmployeeTile(o)));return s+l.join("")+a}async createEmployeeTile(e){const t=this.app.isEmployeeSelected(e.id),i=this.app.getEmployeeInitials(e),s=this.app.getEmployeeDisplayColor(e),a=this.getEmployeeAccessibleDescription(e);return`
            <div class="employee-tile ${t?"active":""}"
                 data-employee-id="${e.id}"
                 role="tab"
                 tabindex="${t?"0":"-1"}"
                 aria-selected="${t}"
                 aria-label="${a}"
                 aria-describedby="employee-desc-${e.id}">
                <div class="employee-avatar" style="--employee-color: ${s}">
                    <div class="avatar-initials" aria-hidden="true">${i}</div>
                </div>
                <div class="employee-name" id="employee-desc-${e.id}">${e.name}</div>
                <button class="employee-actions-btn"
                        aria-label="Åpne handlingsmeny for ${e.name}"
                        aria-haspopup="menu"
                        data-employee-id="${e.id}"
                        tabindex="-1">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                        <circle cx="12" cy="12" r="1"></circle>
                        <circle cx="12" cy="5" r="1"></circle>
                        <circle cx="12" cy="19" r="1"></circle>
                    </svg>
                </button>
            </div>
        `}createAddTile(){return`
            <div class="employee-tile add-tile" 
                 data-action="add" 
                 role="button" 
                 tabindex="0"
                 aria-label="Legg til ny ansatt">
                <div class="employee-avatar add-avatar">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <circle cx="12" cy="12" r="10"></circle>
                        <line x1="12" y1="8" x2="12" y2="16"></line>
                        <line x1="8" y1="12" x2="16" y2="12"></line>
                    </svg>
                </div>
                <div class="employee-name">Legg til</div>
            </div>
        `}showLoadingState(){this.track.innerHTML=`
            <div class="employee-carousel-loading">
                <div class="loading-skeleton"></div>
                <div class="loading-skeleton"></div>
                <div class="loading-skeleton"></div>
            </div>
        `}showErrorState(){this.track.innerHTML=`
            <div class="employee-carousel-error">
                <div class="error-message">Kunne ikke laste ansatte</div>
                <button class="retry-btn" onclick="app.loadEmployees()">Prøv igjen</button>
            </div>
        `}updateActiveStates(){this.track.querySelectorAll(".employee-tile").forEach(t=>{const i=t.dataset.employeeId,s=this.app.isEmployeeSelected(i);t.classList.toggle("active",s),t.setAttribute("aria-selected",s),t.setAttribute("tabindex",s?"0":"-1")})}scrollToActiveItem(){const e=this.track.querySelector(".employee-tile.active");e&&e.scrollIntoView({behavior:"smooth",block:"nearest",inline:"center"})}handleTouchStart(e){const t=e.touches[0];this.touchStartX=t.clientX,this.touchStartY=t.clientY,this.scrollStartX=this.track.scrollLeft,this.isDragging=!1;const i=e.target.closest(".employee-tile");i&&i.dataset.employeeId&&i.dataset.employeeId!=="all"&&this.startLongPress(i,e)}handleTouchMove(e){if(e.touches.length===1){const t=e.touches[0],i=this.touchStartX-t.clientX,s=this.touchStartY-t.clientY;(Math.abs(i)>this.touchThreshold||Math.abs(s)>this.touchThreshold)&&(this.cancelLongPress(),this.isDragging=!0)}}handleTouchEnd(e){this.cancelLongPress(),this.isDragging=!1}handleMouseDown(e){const t=e.target.closest(".employee-tile");t&&t.dataset.employeeId&&t.dataset.employeeId!=="all"&&this.startLongPress(t,e)}handleMouseMove(e){this.cancelLongPress()}handleMouseUp(e){this.cancelLongPress()}handleKeyDown(e){const t=document.activeElement.closest(".employee-tile");if(!t)return;let i=null;switch(e.key){case"ArrowLeft":i=t.previousElementSibling;break;case"ArrowRight":i=t.nextElementSibling;break;case"Enter":case" ":e.preventDefault(),this.handleTileClick(t);return;case"ContextMenu":case"F10":e.shiftKey&&(e.preventDefault(),this.showActionsMenu(t));return}i&&(e.preventDefault(),i.focus(),i.scrollIntoView({behavior:"smooth",inline:"center"}))}handleTileClick(e){const t=e.dataset.employeeId,i=e.dataset.action;if(e.classList.contains("employee-actions-btn")||e.closest(".employee-actions-btn")){const s=e.closest(".employee-tile");if(s){this.showActionsMenu(s);return}}if(i==="add")this.handleAddEmployee();else if(t){const s=this.app.employees.find(a=>a.id===t);s&&(this.app.isEmployeeSelected(t)?this.app.showEditEmployeeModal?.(s):(this.app.setSelectedEmployee(t),this.announceSelection(`${s.name} valgt`)))}}startLongPress(e,t){this.cancelLongPress(),this.longPressTimer=setTimeout(()=>{this.showActionsMenu(e),navigator.vibrate&&navigator.vibrate(50)},this.longPressThreshold)}cancelLongPress(){this.longPressTimer&&(clearTimeout(this.longPressTimer),this.longPressTimer=null)}async showActionsMenu(e){const t=e.dataset.employeeId;if(t)try{const{EmployeeActionsMenu:i}=await r(async()=>{const{EmployeeActionsMenu:s}=await import("./employeeActionsMenu-BIlwAg25.js");return{EmployeeActionsMenu:s}},__vite__mapDeps([0,1,2,3,4]));this.actionsMenu||(this.actionsMenu=new i(this.app)),this.actionsMenu.show(t,e)}catch(i){console.error("Error showing actions menu:",i)}}async handleAddEmployee(){try{const{EmployeeModal:e}=await r(async()=>{const{EmployeeModal:t}=await import("./employeeModal-BeJwqHKx.js");return{EmployeeModal:t}},__vite__mapDeps([5,1,2,3,4]));this.employeeModal||(this.employeeModal=new e(this.app)),console.debug("[employees] opening create employee modal"),await this.employeeModal.showCreate()}catch(e){console.error("Error opening add employee modal:",e),this.announceSelection("Kunne ikke åpne nytt ansatt-vindu")}}update(){this.renderCache.clear(),this.render()}destroy(){this.cancelLongPress(),this.cleanup(),this.actionsMenu&&(this.actionsMenu.hide(),this.actionsMenu=null),this.isInitialized=!1}announceSelection(e){this.statusElement&&(this.statusElement.textContent=e)}announceLoading(){this.announceSelection("Laster ansatte...")}announceError(){this.announceSelection("Feil ved lasting av ansatte")}getEmployeeAccessibleDescription(e){const t=[`Ansatt: ${e.name}`];return e.hourly_wage&&t.push(`Timelønn: ${e.hourly_wage} kr`),e.archived_at&&t.push("Arkivert"),t.join(", ")}updateFocusManagement(){const e=this.track.querySelectorAll(".employee-tile"),t=this.track.querySelector(".employee-tile.active");e.forEach(i=>{const s=i.classList.contains("active");i.setAttribute("tabindex",s?"0":"-1")}),!t&&e.length>0&&e[0].setAttribute("tabindex","0")}handleFocus(e){const t=e.target.closest(".employee-tile");if(t){const i=t.dataset.employeeId;if(i==="all")this.announceSelection("Fokus på: Alle ansatte");else if(t.dataset.action==="add")this.announceSelection("Fokus på: Legg til ny ansatt");else{const s=this.app.employees.find(a=>a.id===i);s&&this.announceSelection(`Fokus på: ${this.getEmployeeAccessibleDescription(s)}`)}}}handleScroll(){this.updateArrowVisibility(),this.isVirtualized&&(this.scrollTimeout||(this.scrollTimeout=setTimeout(()=>{this.updateVisibleRange(),this.scrollTimeout=null},16)))}updateArrowVisibility(){if(!this.leftArrow||!this.rightArrow||!this.track)return;if(!(window.innerWidth>768)){this.leftArrow.style.display="none",this.rightArrow.style.display="none",this.leftEdgeBlur&&(this.leftEdgeBlur.style.display="none"),this.rightEdgeBlur&&(this.rightEdgeBlur.style.display="none");return}const t=this.track.scrollLeft,i=this.track.scrollWidth,s=this.track.clientWidth,a=t>5;this.leftArrow.style.display=a?"flex":"none",this.leftEdgeBlur&&(this.leftEdgeBlur.style.display=a?"block":"none");const l=t<i-s-5;this.rightArrow.style.display=l?"flex":"none",this.rightEdgeBlur&&(this.rightEdgeBlur.style.display=l?"block":"none")}updateVisibleRange(){if(!this.isVirtualized)return;const e=this.track.scrollLeft,t=this.track.clientWidth,i=5,s=Math.max(0,Math.floor(e/this.itemWidth)-i),a=Math.min(this.app.employees.length,Math.ceil((e+t)/this.itemWidth)+i);(Math.abs(s-this.visibleRange.start)>3||Math.abs(a-this.visibleRange.end)>3)&&(this.visibleRange={start:s,end:a},this.renderVirtualizedUpdate())}async renderVirtualizedUpdate(){try{const e=await this.createVirtualizedEmployeeTiles(),t=this.createAddTile();this.track.innerHTML=e+t,this.updateActiveStates(),this.updateFocusManagement()}catch(e){console.error("Error updating virtualized carousel:",e)}}debouncedRender(){this.renderTimeout&&clearTimeout(this.renderTimeout),this.renderTimeout=setTimeout(()=>{this.render(),this.renderTimeout=null},100)}update(){this.generateRenderKey()!==this.lastRenderKey?(this.renderCache.clear(),this.debouncedRender()):(this.updateActiveStates(),this.updateFocusManagement())}cleanup(){this.scrollTimeout&&(clearTimeout(this.scrollTimeout),this.scrollTimeout=null),this.renderTimeout&&(clearTimeout(this.renderTimeout),this.renderTimeout=null),this.renderCache.clear()}handleResize(){const e=this.isMobile;this.isMobile=window.innerWidth<=768,this.isMobile?this.itemWidth=window.innerWidth<=480?60:70:this.itemWidth=80,e!==this.isMobile&&this.debouncedRender(),this.isVirtualized&&this.updateVisibleRange()}}export{u as EmployeeCarousel};
