const __vite__mapDeps=(i,m=__vite__mapDeps,d=(m.f||(m.f=["chunks/employeeService-BzRZ7ePp.js","chunks/apiBase-C8RWFuli.js"])))=>i.map(i=>d[i]);
import{_ as v}from"./supabase-client-C25D-rrn.js";class b{constructor(e){this.app=e,this.isVisible=!1,this.mode="create",this.currentEmployee=null,this.originalData=null,this.isSubmitting=!1,this.validationErrors={},this.formData={name:"",email:"",hourly_wage:"",tariff_level:0,birth_date:"",display_color:"#6366f1"},this.handleSubmit=this.handleSubmit.bind(this),this.handleCancel=this.handleCancel.bind(this),this.handleKeyDown=this.handleKeyDown.bind(this),this.handleClickOutside=this.handleClickOutside.bind(this),this.handleFieldChange=this.handleFieldChange.bind(this)}getInitialFormDefaults(){return{name:"",email:"",hourly_wage:"",tariff_level:0,birth_date:"",display_color:"#6366f1"}}normalizeEmployeeName(e){const t=(e??"").toString().trim().replace(/\s+/g," ");if(!t)return"";const i=a=>a&&a.length>0?a.charAt(0).toUpperCase()+a.slice(1).toLowerCase():"";return t.split(" ").map(a=>a.split("-").map(s=>s.split("'").map(i).join("'")).join("-")).join(" ")}async loadEmployeeService(){try{if(typeof global<"u"&&typeof global.import=="function")return await global.import("./employeeService.js")}catch{}return await v(()=>import("./employeeService-BzRZ7ePp.js"),__vite__mapDeps([0,1]))}async showCreate(){this.mode="create",this.currentEmployee=null,this.resetForm(),await this.show()}async showEdit(e){this.mode="edit",this.currentEmployee=e,this.originalData={...e},await this.populateForm(e),await this.show()}async show(){try{this.createModal(),this.attachEventListeners(),this.isVisible=!0,setTimeout(()=>{const e=this.modal.querySelector('input[name="name"]');e&&e.focus()},100)}catch(e){console.error("Error showing employee modal:",e)}}hide(){this.isVisible&&(this.removeEventListeners(),this.modal&&(this.modal.classList.remove("active"),setTimeout(()=>{this.modal&&this.modal.parentNode&&this.modal.remove(),this.modal=null},300)),this.isVisible=!1,this.resetForm())}createModal(){const e=document.getElementById("employeeModal");e&&e.remove(),this.modal=document.createElement("div"),this.modal.id="employeeModal",this.modal.className="modal",this.modal.innerHTML=this.getModalHTML(),document.body.appendChild(this.modal),setTimeout(()=>{this.modal.classList.add("active")},10)}getModalHTML(){const e=this.mode==="create"?"Legg til ansatt":"Rediger ansatt",t=this.mode==="create"?"Legg til ansatt":"Lagre endringer",i=this.app?.PRESET_WAGE_RATES||{},a=s=>typeof s=="number"?s.toFixed(2).replace(".",","):"";return`
            <div class="modal-content employee-modal-content">
                <div class="modal-header">
                    <div class="modal-header-content">
                        <h2>${e}</h2>
                        <p class="modal-subtitle">Fyll inn informasjonen under for å ${this.mode==="create"?"legge til en ny ansatt":"oppdatere ansattinformasjonen"}</p>
                    </div>
                    <button type="button" class="modal-close-btn" aria-label="Lukk">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                    </button>
                </div>

                <form class="employee-form" id="employeeForm" novalidate>
                    <div class="form-sections">
                        <!-- Step indicators -->
                        <div class="form-progress">
                            <div class="progress-step active" data-step="1">
                                <div class="step-number">1</div>
                                <div class="step-label">Informasjon</div>
                            </div>
                            <div class="progress-line"></div>
                            <div class="progress-step" data-step="2">
                                <div class="step-number">2</div>
                                <div class="step-label">Lønn</div>
                            </div>
                            <div class="progress-line"></div>
                            <div class="progress-step" data-step="3">
                                <div class="step-number">3</div>
                                <div class="step-label">Tilpasning</div>
                            </div>
                        </div>

                        <!-- Basic Information Section -->
                        <div class="form-section active" data-section="1">
                            <div class="section-icon">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                                    <circle cx="12" cy="7" r="4"></circle>
                                </svg>
                            </div>
                            
                            <div class="form-fields">
                                <div class="form-group">
                                    <label for="employeeName" class="form-label">
                                        <span class="label-text">Fullt navn</span>
                                        <span class="required-badge">Påkrevd</span>
                                    </label>
                                    <div class="input-wrapper">
                                        <svg class="input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                                            <circle cx="12" cy="7" r="4"></circle>
                                        </svg>
                                        <input
                                            type="text"
                                            id="employeeName"
                                            name="name"
                                            class="form-input with-icon"
                                            required
                                            autocomplete="name"
                                            placeholder="F.eks. Ola Nordmann"
                                            aria-describedby="nameError">
                                    </div>
                                    <div class="form-error" id="nameError" role="alert"></div>
                                </div>

                                <div class="form-row">
                                    <div class="form-group">
                                        <label for="employeeEmail" class="form-label">
                                            <span class="label-text">E-postadresse</span>
                                            <span class="optional-badge">Valgfritt</span>
                                        </label>
                                        <div class="input-wrapper">
                                            <svg class="input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                                <rect x="2" y="4" width="20" height="16" rx="2"></rect>
                                                <path d="m22 7-10 5L2 7"></path>
                                            </svg>
                                            <input
                                                type="email"
                                                id="employeeEmail"
                                                name="email"
                                                class="form-input with-icon"
                                                autocomplete="email"
                                                placeholder="ola@bedrift.no"
                                                aria-describedby="emailError">
                                        </div>
                                        <div class="form-error" id="emailError" role="alert"></div>
                                    </div>

                                    <div class="form-group">
                                        <label for="employeeBirthDate" class="form-label">
                                            <span class="label-text">Fødselsdato</span>
                                            <span class="optional-badge">Valgfritt</span>
                                        </label>
                                        <div class="date-selector-group">
                                            <select id="birthDaySelect" class="form-input date-select" aria-label="Dag">
                                                <option value="">Dag</option>
                                            </select>
                                            <select id="birthMonthSelect" class="form-input date-select" aria-label="Måned">
                                                <option value="">Måned</option>
                                                <option value="01">Januar</option>
                                                <option value="02">Februar</option>
                                                <option value="03">Mars</option>
                                                <option value="04">April</option>
                                                <option value="05">Mai</option>
                                                <option value="06">Juni</option>
                                                <option value="07">Juli</option>
                                                <option value="08">August</option>
                                                <option value="09">September</option>
                                                <option value="10">Oktober</option>
                                                <option value="11">November</option>
                                                <option value="12">Desember</option>
                                            </select>
                                            <select id="birthYearSelect" class="form-input date-select" aria-label="År">
                                                <option value="">År</option>
                                            </select>
                                        </div>
                                        <input
                                            type="hidden"
                                            id="employeeBirthDate"
                                            name="birth_date"
                                            aria-describedby="birthDateError">
                                        <div class="form-error" id="birthDateError" role="alert"></div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- Wage Information Section -->
                        <div class="form-section" data-section="2" style="display: none;">
                            <div class="section-icon">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <line x1="12" y1="1" x2="12" y2="23"></line>
                                    <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
                                </svg>
                            </div>

                            <div class="form-fields">
                                <div class="form-group">
                                    <label for="employeeTariff" class="form-label">
                                        <span class="label-text">Velg lønnstrinn</span>
                                        <span class="required-badge">Påkrevd</span>
                                    </label>
                                    <div class="tariff-grid">
                                        <label class="tariff-option">
                                            <input type="radio" name="tariff_radio" value="0" ${this.formData.tariff_level==0?"checked":""}>
                                            <div class="tariff-card">
                                                <span class="tariff-name">Egendefinert</span>
                                                <span class="tariff-rate">Angi selv</span>
                                            </div>
                                        </label>
                                        <label class="tariff-option">
                                            <input type="radio" name="tariff_radio" value="-2" ${this.formData.tariff_level==-2?"checked":""}>
                                            <div class="tariff-card">
                                                <span class="tariff-name">Under 18 år</span>
                                                <span class="tariff-rate">${a(i[-2])} kr/t</span>
                                            </div>
                                        </label>
                                        <label class="tariff-option">
                                            <input type="radio" name="tariff_radio" value="-1" ${this.formData.tariff_level==-1?"checked":""}>
                                            <div class="tariff-card">
                                                <span class="tariff-name">Under 16 år</span>
                                                <span class="tariff-rate">${a(i[-1])} kr/t</span>
                                            </div>
                                        </label>
                                        <label class="tariff-option">
                                            <input type="radio" name="tariff_radio" value="1" ${this.formData.tariff_level==1?"checked":""}>
                                            <div class="tariff-card">
                                                <span class="tariff-name">Trinn 1</span>
                                                <span class="tariff-rate">${a(i[1])} kr/t</span>
                                            </div>
                                        </label>
                                        <label class="tariff-option">
                                            <input type="radio" name="tariff_radio" value="2" ${this.formData.tariff_level==2?"checked":""}>
                                            <div class="tariff-card">
                                                <span class="tariff-name">Trinn 2</span>
                                                <span class="tariff-rate">${a(i[2])} kr/t</span>
                                            </div>
                                        </label>
                                        <label class="tariff-option">
                                            <input type="radio" name="tariff_radio" value="3" ${this.formData.tariff_level==3?"checked":""}>
                                            <div class="tariff-card">
                                                <span class="tariff-name">Trinn 3</span>
                                                <span class="tariff-rate">${a(i[3])} kr/t</span>
                                            </div>
                                        </label>
                                        <label class="tariff-option">
                                            <input type="radio" name="tariff_radio" value="4" ${this.formData.tariff_level==4?"checked":""}>
                                            <div class="tariff-card">
                                                <span class="tariff-name">Trinn 4</span>
                                                <span class="tariff-rate">${a(i[4])} kr/t</span>
                                            </div>
                                        </label>
                                        <label class="tariff-option">
                                            <input type="radio" name="tariff_radio" value="5" ${this.formData.tariff_level==5?"checked":""}>
                                            <div class="tariff-card">
                                                <span class="tariff-name">Trinn 5</span>
                                                <span class="tariff-rate">${a(i[5])} kr/t</span>
                                            </div>
                                        </label>
                                        <label class="tariff-option">
                                            <input type="radio" name="tariff_radio" value="6" ${this.formData.tariff_level==6?"checked":""}>
                                            <div class="tariff-card">
                                                <span class="tariff-name">Trinn 6</span>
                                                <span class="tariff-rate">${a(i[6])} kr/t</span>
                                            </div>
                                        </label>
                                    </div>
                                    <!-- Hidden select for form submission -->
                                    <select id="employeeTariff" name="tariff_level" class="form-input" style="display: none;" aria-describedby="tariffError">
                                        <option value="0">Egendefinert</option>
                                        <option value="-2">Under 18 år</option>
                                        <option value="-1">Under 16 år</option>
                                        <option value="1">Trinn 1</option>
                                        <option value="2">Trinn 2</option>
                                        <option value="3">Trinn 3</option>
                                        <option value="4">Trinn 4</option>
                                        <option value="5">Trinn 5</option>
                                        <option value="6">Trinn 6</option>
                                    </select>
                                    <div class="form-error" id="tariffError" role="alert"></div>
                                </div>

                                <div class="form-group custom-wage-group" id="customWageSection" style="display: none;">
                                    <label for="employeeWage" class="form-label">
                                        <span class="label-text">Angi timelønn</span>
                                    </label>
                                    <div class="input-wrapper">
                                        <span class="input-prefix">kr</span>
                                        <input
                                            type="number"
                                            id="employeeWage"
                                            name="hourly_wage"
                                            class="form-input with-prefix"
                                            min="0"
                                            step="0.01"
                                            placeholder="250.00"
                                            aria-describedby="wageError">
                                        <span class="input-suffix">/time</span>
                                    </div>
                                    <div class="form-error" id="wageError" role="alert"></div>
                                </div>

                                <!-- Effective wage preview (accessible, always present) -->
                                <div class="form-group effective-rate-group">
                                    <label class="form-label" id="effectiveRateLabel">
                                        <span class="label-text">Gjeldende timelønn</span>
                                    </label>
                                    <div id="effectiveRatePreview"
                                         class="effective-rate-value"
                                         role="status"
                                         aria-live="polite"
                                         aria-atomic="true"
                                         aria-labelledby="effectiveRateLabel">-</div>
                                    <p class="form-hint">Beregnes automatisk fra valgt lønnstrinn eller egendefinert timelønn</p>
                                </div>

                                <div class="wage-info-card">
                                    <div class="wage-info-icon">
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                            <circle cx="12" cy="12" r="10"></circle>
                                            <line x1="12" y1="16" x2="12" y2="12"></line>
                                            <line x1="12" y1="8" x2="12.01" y2="8"></line>
                                        </svg>
                                    </div>
                                    <div class="wage-info-content">
                                        <p>Kveld- og helgetillegg beregnes automatisk basert på tariff, selv med egendefinert timelønn.</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- Appearance Section -->
                        <div class="form-section" data-section="3" style="display: none;">
                            <div class="section-icon">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <circle cx="12" cy="12" r="3"></circle>
                                    <circle cx="12" cy="12" r="10"></circle>
                                    <line x1="12" y1="2" x2="12" y2="4"></line>
                                    <line x1="12" y1="20" x2="12" y2="22"></line>
                                    <line x1="2" y1="12" x2="4" y2="12"></line>
                                    <line x1="20" y1="12" x2="22" y2="12"></line>
                                </svg>
                            </div>

                            <div class="form-fields">
                                <div class="form-group">
                                    <label class="form-label">
                                        <span class="label-text">Velg en farge for den ansatte</span>
                                    </label>
                                    <input
                                        type="color"
                                        id="employeeColor"
                                        name="display_color"
                                        class="color-input-hidden"
                                        value="#6366f1"
                                        aria-describedby="colorHint">
                                    <div class="color-grid" id="colorPresets">
                                        <!-- Color presets will be populated here -->
                                    </div>
                                    <p class="form-hint centered" id="colorHint">Denne fargen brukes til å identifisere den ansatte i kalenderen</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="modal-footer">
                        <div class="footer-left">
                            <button type="button" class="btn btn-ghost nav-btn prev-btn" style="display: none;">
                                <svg class="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <polyline points="15 18 9 12 15 6"></polyline>
                                </svg>
                                Forrige
                            </button>
                        </div>
                        <div class="footer-right">
                            <button type="button" class="btn btn-secondary cancel-btn">
                                Avbryt
                            </button>
                            <button type="button" class="btn btn-primary nav-btn next-btn">
                                Neste
                                <svg class="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <polyline points="9 18 15 12 9 6"></polyline>
                                </svg>
                            </button>
                            <button type="submit" class="btn btn-primary submit-btn" style="display: none;">
                                <span class="btn-text">
                                    ${t}
                                </span>
                                <span class="btn-loading" style="display: none;">
                                    <svg class="loading-spinner" viewBox="0 0 24 24">
                                        <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-dasharray="31.416" stroke-dashoffset="31.416">
                                            <animate attributeName="stroke-dasharray" dur="2s" values="0 31.416;15.708 15.708;0 31.416" repeatCount="indefinite"/>
                                            <animate attributeName="stroke-dashoffset" dur="2s" values="0;-15.708;-31.416" repeatCount="indefinite"/>
                                        </circle>
                                    </svg>
                                    Lagrer...
                                </span>
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        `}resetForm(){this.formData={name:"",email:"",hourly_wage:"",tariff_level:0,birth_date:"",display_color:"#6366f1"},this.validationErrors={},this.isSubmitting=!1}async populateForm(e){this.formData={name:e.name||"",email:e.email||"",hourly_wage:e.hourly_wage||"",tariff_level:e.tariff_level!==void 0&&e.tariff_level!==null?e.tariff_level:0,birth_date:e.birth_date||"",display_color:e.display_color||"#6366f1"}}attachEventListeners(){if(!this.modal)return;this.currentStep=1,this.totalSteps=3;const e=this.modal.querySelector("#employeeForm");e&&e.addEventListener("submit",this.handleSubmit);const t=this.modal.querySelector(".next-btn"),i=this.modal.querySelector(".prev-btn");t&&t.addEventListener("click",()=>this.navigateStep("next")),i&&i.addEventListener("click",()=>this.navigateStep("prev"));const a=this.modal.querySelector(".cancel-btn");a&&a.addEventListener("click",this.handleCancel);const s=this.modal.querySelector(".modal-close-btn");s&&s.addEventListener("click",this.handleCancel),this.modal.querySelectorAll('input[name="tariff_radio"]').forEach(l=>{l.addEventListener("change",d=>{const o=d.target.value,c=this.modal.querySelector("#employeeTariff");c&&(c.value=o,this.formData.tariff_level=o,this.updateCustomWageVisibility(),this.updateEffectiveRatePreview())})}),this.modal.querySelectorAll('input[type="text"], input[type="email"], input[type="date"], input[type="number"], select, textarea').forEach(l=>{l.addEventListener("input",this.handleFieldChange),l.addEventListener("blur",this.handleFieldBlur.bind(this))}),this.setupColorPresets(),this.setupBirthDateSelectors(),document.addEventListener("keydown",this.handleKeyDown),this.modal.addEventListener("click",this.handleClickOutside),this.updateFormFields(),this.updateCustomWageVisibility()}navigateStep(e){this.modal&&(e==="next"&&!this.validateCurrentStep()||(e==="next"&&this.currentStep<this.totalSteps?this.currentStep++:e==="prev"&&this.currentStep>1&&this.currentStep--,this.updateStepUI()))}validateCurrentStep(){let e=!0;if(this.currentStep===1){const t=this.modal.querySelector('[name="name"]');t&&!this.validateField("name",t.value)&&(e=!1);const i=this.modal.querySelector('[name="email"]');i&&i.value&&!this.validateField("email",i.value)&&(e=!1);const a=this.modal.querySelector('[name="birth_date"]');a&&a.value&&!this.validateField("birth_date",a.value)&&(e=!1)}else if(this.currentStep===2&&(this.modal.querySelectorAll('input[name="tariff_radio"]:checked').length===0&&(this.validationErrors.tariff_level="Velg et lønnstrinn",this.updateFieldValidationUI("tariff_level"),e=!1),this.formData.tariff_level==0)){const i=this.formData.hourly_wage!=null&&String(this.formData.hourly_wage).trim().length>0;(!i||!this.validateField("hourly_wage",this.formData.hourly_wage))&&(this.validationErrors.hourly_wage=i?this.validationErrors.hourly_wage:"Timelønn er påkrevd for Egendefinert",this.updateFieldValidationUI("hourly_wage"),e=!1)}return this.updateValidationUI(),e}updateStepUI(){if(!this.modal)return;this.modal.querySelectorAll(".progress-step").forEach((n,l)=>{const d=l+1;n.classList.toggle("active",d===this.currentStep),n.classList.toggle("completed",d<this.currentStep)}),this.modal.querySelectorAll(".form-section[data-section]").forEach(n=>{const l=parseInt(n.dataset.section);n.style.display=l===this.currentStep?"block":"none"});const i=this.modal.querySelector(".prev-btn"),a=this.modal.querySelector(".next-btn"),s=this.modal.querySelector(".submit-btn");i&&(i.style.display=this.currentStep>1?"flex":"none"),a&&(a.style.display=this.currentStep<this.totalSteps?"flex":"none"),s&&(s.style.display=this.currentStep===this.totalSteps?"flex":"none");const r=this.modal.querySelector(`.form-section[data-section="${this.currentStep}"]`);if(r){const n=r.querySelector('input:not([type="hidden"]):not([type="radio"]), select');n&&setTimeout(()=>n.focus(),100)}}removeEventListeners(){document.removeEventListener("keydown",this.handleKeyDown),this.modal&&this.modal.removeEventListener("click",this.handleClickOutside)}updateFormFields(){if(!this.modal)return;Object.keys(this.formData).forEach(i=>{const a=this.modal.querySelector(`[name="${i}"]`);a&&this.formData[i]!==null&&this.formData[i]!==void 0&&(a.value=this.formData[i])}),this.updateEffectiveRatePreview();const e=this.modal.querySelector(".submit-btn");e&&e.getAttribute("type")!=="submit"&&e.setAttribute("type","submit");const t=this.modal.querySelector(".cancel-btn");t&&t.getAttribute("type")!=="button"&&t.setAttribute("type","button")}updateEffectiveRatePreview(){if(!this.modal)return;const e=parseInt(this.formData.tariff_level||0),t=this.app?.PRESET_WAGE_RATES||{};let i=null;if(e===0){const r=this.formData.hourly_wage;i=r!==""&&r!==null&&r!==void 0?parseFloat(r):null}else i=t[e]??null;const a=this.modal.querySelector("#effectiveRatePreview");a&&(a.textContent=i!=null&&!Number.isNaN(i)?`${i.toFixed(2).replace(".",",")} kr/t`:"-");const s=this.modal.querySelector("#employeeWage");s&&(s.disabled=e!==0)}updateCustomWageVisibility(){if(!this.modal)return;const e=this.modal.querySelector("#customWageSection");if(!e)return;const i=parseInt(this.formData.tariff_level||0)===0;e.style.display=i?"block":"none"}setupColorPresets(){const e=this.modal?.querySelector("#colorPresets");if(!e)return;const t=[{color:"#6366f1",name:"Indigo"},{color:"#8b5cf6",name:"Lilla"},{color:"#ec4899",name:"Rosa"},{color:"#ef4444",name:"Rød"},{color:"#f97316",name:"Oransje"},{color:"#f59e0b",name:"Gul"},{color:"#84cc16",name:"Lime"},{color:"#22c55e",name:"Grønn"},{color:"#10b981",name:"Smaragd"},{color:"#06b6d4",name:"Cyan"},{color:"#0ea5e9",name:"Himmelblå"},{color:"#3b82f6",name:"Blå"}];e.innerHTML=t.map(({color:i,name:a})=>`
            <button type="button" class="color-option" data-color="${i}" aria-label="${a}">
                <span class="color-swatch" style="background-color: ${i}"></span>
                <span class="color-check">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
                        <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                </span>
            </button>
        `).join(""),e.addEventListener("click",i=>{const a=i.target.closest(".color-option");if(a){const s=a.dataset.color;this.formData.display_color=s;const r=this.modal.querySelector('[name="display_color"]');r&&(r.value=s),this.updateColorPresetSelection()}}),this.updateColorPresetSelection()}setupBirthDateSelectors(){if(!this.modal)return;const e=this.modal.querySelector("#birthYearSelect"),t=this.modal.querySelector("#birthMonthSelect"),i=this.modal.querySelector("#birthDaySelect"),a=this.modal.querySelector("#employeeBirthDate");if(!e||!t||!i||!a)return;const s=new Date,r=s.getFullYear()-75,n=s.getFullYear()-13;if(e.options.length<=1){e.innerHTML='<option value="">År</option>';for(let c=n;c>=r;c--){const p=document.createElement("option");p.value=String(c),p.textContent=String(c),e.appendChild(p)}}const l=()=>{const c=i.value,p=parseInt(e.value,10),f=parseInt(t.value,10);if(!p||!f){i.innerHTML='<option value="">Dag</option>';return}const h=new Date(p,f,0).getDate();i.innerHTML='<option value="">Dag</option>';for(let m=1;m<=h;m++){const u=document.createElement("option");u.value=String(m).padStart(2,"0"),u.textContent=String(m),i.appendChild(u)}c&&parseInt(c)<=h&&(i.value=c)},d=()=>{const c=e.value,p=t.value,f=i.value;if(c&&p&&f){const h=`${c}-${p}-${f}`;a.value=h,this.formData.birth_date=h,this.clearFieldError("birth_date")}else a.value="",this.formData.birth_date=""},o=(this.formData.birth_date||"").trim();if(/^\d{4}-\d{2}-\d{2}$/.test(o)){const[c,p,f]=o.split("-");e.value=c,t.value=p,l(),i.value=f}e.addEventListener("change",()=>{l(),d()}),t.addEventListener("change",()=>{l(),d()}),i.addEventListener("change",()=>{d()})}updateColorPresetSelection(){const e=this.modal?.querySelectorAll(".color-option");e&&e.forEach(t=>{t.classList.toggle("selected",t.dataset.color===this.formData.display_color)})}handleFieldChange(e){const{name:t,value:i}=e.target;t in this.formData&&(this.formData[t]=i,this.clearFieldError(t),t==="display_color"&&this.updateColorPresetSelection(),(t==="tariff_level"||t==="hourly_wage")&&this.updateEffectiveRatePreview(),t==="tariff_level"&&this.updateCustomWageVisibility())}handleFieldBlur(e){const{name:t,value:i}=e.target;if(t==="name"){const a=this.normalizeEmployeeName(i);if(a!==this.formData.name){this.formData.name=a;const s=this.modal?.querySelector('[name="name"]');s&&(s.value=a)}this.validateField(t,a);return}this.validateField(t,i)}async handleSubmit(e){if(e.preventDefault(),!this.isSubmitting)try{if(console.debug("[employees] submit-click",{mode:this.mode}),!this.validateForm()){console.debug("[employees] validation failed",this.validationErrors);return}this.setSubmitting(!0),this.mode==="create"?await this.createEmployee():await this.updateEmployee(),this.hide()}catch(t){console.error("Error submitting form:",t),this.showError(t.message||"En feil oppstod ved lagring")}finally{this.setSubmitting(!1)}}handleCancel(){this.isSubmitting||this.hasUnsavedChanges()&&!confirm("Du har ulagrede endringer. Er du sikker på at du vil lukke?")||this.hide()}handleKeyDown(e){this.isVisible&&e.key==="Escape"&&(e.preventDefault(),this.handleCancel())}handleClickOutside(e){e.target===this.modal&&this.handleCancel()}setSubmitting(e){this.isSubmitting=e;const t=this.modal?.querySelector(".submit-btn"),i=this.modal?.querySelector(".btn-text"),a=this.modal?.querySelector(".btn-loading");t&&(t.disabled=e,t.classList.toggle("loading",e)),i&&(i.style.display=e?"none":"inline"),a&&(a.style.display=e?"inline-flex":"none"),this.modal?.querySelectorAll("input, button, select, textarea")?.forEach(r=>{!r.classList.contains("submit-btn")&&!r.classList.contains("cancel-btn")&&(r.disabled=e)})}hasUnsavedChanges(){if(this.mode==="create"){const i=this.getInitialFormDefaults(),a=(s,r)=>{if(s==null&&(s=""),typeof r=="number"){if(typeof s=="number")return s;if(typeof s=="string"){const l=s.trim();if(l==="")return r;const d=Number(l);return Number.isNaN(d)?r:d}return r}return String(s)};return Object.keys(i).some(s=>{const r=a(this.formData[s],i[s]),n=a(i[s],i[s]);return r!==n})}if(!this.originalData)return!1;const e=i=>i??"";return Object.keys(this.formData).some(i=>{const a=this.getInitialFormDefaults()[i],s=this.originalData[i]!==void 0?this.originalData[i]:a;return e(this.formData[i])!==e(s)})}showError(e){alert(e)}validateForm(){this.validationErrors={};let e=!0;return this.validateField("name",this.formData.name)||(e=!1),this.formData.email&&!this.validateField("email",this.formData.email)&&(e=!1),this.formData.hourly_wage&&!this.validateField("hourly_wage",this.formData.hourly_wage)&&(e=!1),this.formData.birth_date&&!this.validateField("birth_date",this.formData.birth_date)&&(e=!1),this.validateField("display_color",this.formData.display_color)||(e=!1),this.validateField("tariff_level",this.formData.tariff_level)||(e=!1),this.updateValidationUI(),e}validateField(e,t){let i=!0,a="";switch(e){case"name":!t||t.trim().length===0?(a="Navn er påkrevd",i=!1):t.trim().length<2?(a="Navn må være minst 2 tegn",i=!1):t.trim().length>100?(a="Navn kan ikke være lengre enn 100 tegn",i=!1):/^[a-zA-ZæøåÆØÅ\s\-'\.]+$/.test(t.trim())||(a="Navn kan kun inneholde bokstaver, mellomrom, bindestrek og apostrof",i=!1);break;case"email":t&&t.trim().length>0&&(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(t.trim())?t.trim().length>254&&(a="E-postadresse kan ikke være lengre enn 254 tegn",i=!1):(a="Ugyldig e-postadresse",i=!1));break;case"hourly_wage":if(t&&t.toString().trim().length>0){const s=parseFloat(t);isNaN(s)?(a="Timelønn må være et gyldig tall",i=!1):s<0?(a="Timelønn kan ikke være negativ",i=!1):s>1e4&&(a="Timelønn kan ikke være høyere enn 10 000 kr",i=!1)}break;case"birth_date":if(t&&t.trim().length>0){const s=new Date(t),r=new Date,n=new Date(r.getFullYear()-100,r.getMonth(),r.getDate()),l=new Date(r.getFullYear()-13,r.getMonth(),r.getDate());isNaN(s.getTime())?(a="Ugyldig dato",i=!1):s<n?(a="Fødselsdato kan ikke være mer enn 100 år tilbake",i=!1):s>l&&(a="Ansatt må være minst 13 år gammel",i=!1)}break;case"display_color":!t||t.trim().length===0?(a="Visningsfarge er påkrevd",i=!1):/^#[0-9A-Fa-f]{6}$/.test(t.trim())||(a="Ugyldig fargeformat (må være hex-format som #FF0000)",i=!1);break;case"tariff_level":if(t==null||t==="")a="Velg lønnstrinn eller Egendefinert",i=!1;else{const s=parseInt(t);[0,-2,-1,1,2,3,4,5,6].includes(s)||(a="Ugyldig lønnstrinn",i=!1)}break}return i?delete this.validationErrors[e]:this.validationErrors[e]=a,this.updateFieldValidationUI(e),i}clearFieldError(e){delete this.validationErrors[e],this.updateFieldValidationUI(e)}updateValidationUI(){Object.keys(this.validationErrors).forEach(e=>{this.updateFieldValidationUI(e)})}updateFieldValidationUI(e){if(!this.modal)return;const t=this.modal.querySelector(`[name="${e}"]`),i=this.modal.querySelector(`#${e}Error`),a=t?.closest(".form-group");if(!t||!i)return;const s=e in this.validationErrors,r=this.validationErrors[e]||"";t.classList.toggle("error",s),t.classList.toggle("valid",!s&&t.value.trim().length>0),a&&(a.classList.toggle("has-error",s),a.classList.toggle("has-success",!s&&t.value.trim().length>0)),i.textContent=r,i.style.display=s?"block":"none",t.setAttribute("aria-invalid",s.toString()),s?t.setAttribute("aria-describedby",`${e}Error`):t.removeAttribute("aria-describedby")}async createEmployee(){if((this.formData.tariff_level===void 0||this.formData.tariff_level===null||this.formData.tariff_level==="")&&(this.formData.tariff_level=0),this.formData.display_color||(this.formData.display_color="#6366f1"),!this.validateForm())throw new Error("Valideringsfeil: Kontroller feltene");const e=this.normalizeEmployeeName(this.formData.name),t={id:`temp_${Date.now()}`,name:e,email:this.formData.email.trim()||null,hourly_wage:this.formData.hourly_wage?parseFloat(this.formData.hourly_wage):null,birth_date:this.formData.birth_date||null,display_color:this.formData.display_color,created_at:new Date().toISOString(),archived_at:null,_optimistic:!0,_loading:!0};try{this.app.employees.push(t),this.app.onEmployeesLoaded();const{employeeService:i}=await this.loadEmployeeService(),a={name:e,email:this.formData.email.trim()||null,hourly_wage:this.formData.hourly_wage?parseFloat(this.formData.hourly_wage):null,tariff_level:this.formData.tariff_level!==void 0?parseInt(this.formData.tariff_level):0,birth_date:this.formData.birth_date||null,display_color:this.formData.display_color},s=await i.createEmployee(a);try{window.employee_create_success_total=(window.employee_create_success_total||0)+1}catch{}const r=this.app.employees.findIndex(n=>n.id===t.id);r!==-1&&(this.app.employees[r]=s,this.app.onEmployeesLoaded()),this.showSuccess(`${s.name} ble lagt til`)}catch(i){console.error("Error creating employee:",i);try{window.employee_create_error_total=(window.employee_create_error_total||0)+1}catch{}throw this.rollbackOptimisticCreate(t.id),new Error(i.message||"Kunne ikke opprette ansatt")}}async updateEmployee(){if(!this.currentEmployee)throw new Error("Ingen ansatt valgt for redigering");const e={};let t=!1;const i=this.normalizeEmployeeName(this.formData.name);i!==(this.originalData.name||"")&&(e.name=i),this.formData.email.trim()!==(this.originalData.email||"")&&(e.email=this.formData.email.trim()||null);const a=this.formData.hourly_wage?parseFloat(this.formData.hourly_wage):null;a!==this.originalData.hourly_wage&&(e.hourly_wage=a,t=!0);const s=this.formData.tariff_level!==void 0?parseInt(this.formData.tariff_level):0;s!==(this.originalData.tariff_level??0)&&(e.tariff_level=s,t=!0),this.formData.birth_date!==(this.originalData.birth_date||"")&&(e.birth_date=this.formData.birth_date||null),this.formData.display_color!==(this.originalData.display_color||"")&&(e.display_color=this.formData.display_color);let r=!1;t&&this.app.shifts&&this.app.shifts.length>0&&this.app.shifts.some(o=>o.employee_id===this.currentEmployee.id)&&(r=await this.showWageChangeConfirmation());const n={...this.currentEmployee},l=this.app.employees.findIndex(d=>d.id===this.currentEmployee.id);if(l===-1)throw new Error("Ansatt ikke funnet i lokal cache");try{if(Object.keys(e).length>0){const p={...this.app.employees[l],...e,_optimistic:!0,_loading:!0};this.app.employees[l]=p,this.app.onEmployeesLoaded()}const{employeeService:d}=await this.loadEmployeeService();let o=this.currentEmployee;Object.keys(e).length>0&&(o=await d.updateEmployee(this.currentEmployee.id,e)),Object.keys(e).length>0&&(this.app.employees[l]=o,this.app.onEmployeesLoaded(),this.app.employeeCarousel&&this.app.currentEmployee?.id===o.id&&(this.app.currentEmployee=o,this.app.employeeCarousel.updateEmployeeDisplay(o)),this.app.updateShiftDisplay&&this.app.updateShiftDisplay()),r&&t&&await this.updateExistingShiftsWage(o);const c=r&&t?" og eksisterende vakter ble oppdatert":"";this.showSuccess(`${o.name} ble oppdatert${c}`)}catch(d){throw console.error("Error updating employee:",d),this.rollbackOptimisticUpdate(l,n),new Error(d.message||"Kunne ikke oppdatere ansatt")}}async updateExistingShiftsWage(e){try{const t=this.app.shifts.filter(s=>s.employee_id===e.id),i=this.app?.PRESET_WAGE_RATES||{},a=[];for(const s of t){const r=e.tariff_level!=null?parseInt(e.tariff_level,10):null,l=(r?i[r]??null:null)??e.hourly_wage??null,d=s.hourly_wage_snapshot;if(l!=null){const o=Number(l);d!==o&&(s.hourly_wage_snapshot=o,a.push(s))}if(this.app.calculateShift){const o=this.app.calculateShift(s);s.calculated_wage=o.total}}if(t.length===0)return;try{const{data:{session:s}}=await window.supa.auth.getSession();if(s){const r={Authorization:`Bearer ${s.access_token}`,"Content-Type":"application/json"},{currentMonth:n,currentYear:l}=this.app||{},d=new Set((a||[]).map(o=>o.id));for(const o of t){const c=o.date instanceof Date?o.date:o.shift_date?new Date(o.shift_date):null;!!(c&&!Number.isNaN(c.getTime())&&c.getMonth()===n-1&&c.getFullYear()===l)&&d.has(o.id)&&await fetch(`${window.CONFIG.apiBase}/employee-shifts/${o.id}`,{method:"PUT",headers:r,body:JSON.stringify({notes:o.notes??void 0})}).catch(()=>{})}}}catch(s){console.warn("Retroactive server update failed or skipped:",s)}this.app.updateShiftDisplay&&this.app.updateShiftDisplay(),this.app.fetchAndDisplayEmployeeShifts&&await this.app.fetchAndDisplayEmployeeShifts(),console.log(`Updated ${t.length} existing shifts with new wage data`)}catch(t){console.error("Error updating existing shifts:",t)}}async showWageChangeConfirmation(){return new Promise(e=>{const t=document.createElement("div");t.className="modal active confirmation-modal",t.innerHTML=`
                <div class="modal-content" style="max-width: 480px;">
                    <div class="modal-header">
                        <h2>Oppdater lønn</h2>
                    </div>
                    <div class="modal-body" style="padding: 24px;">
                        <div class="confirmation-icon" style="margin-bottom: 20px;">
                            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" stroke-width="2">
                                <circle cx="12" cy="12" r="10"></circle>
                                <path d="M12 8v4"></path>
                                <path d="M12 16h.01"></path>
                            </svg>
                        </div>
                        <p style="font-size: 16px; color: var(--text-primary); margin-bottom: 12px;">
                            Du har endret lønnen for denne ansatte.
                        </p>
                        <p style="font-size: 14px; color: var(--text-secondary); line-height: 1.6;">
                            Vil du oppdatere lønnen kun for fremtidige vakter, eller også for eksisterende vakter som ikke er godkjent ennå?
                        </p>
                    </div>
                    <div class="modal-footer" style="padding: 20px 24px; gap: 12px; display: flex; justify-content: flex-end;">
                        <button type="button" class="btn btn-secondary" id="futureOnlyBtn">
                            Kun fremtidige vakter
                        </button>
                        <button type="button" class="btn btn-primary" id="retroactiveBtn">
                            Oppdater eksisterende vakter
                        </button>
                    </div>
                </div>
            `,document.body.appendChild(t);const i=t.querySelector("#futureOnlyBtn"),a=t.querySelector("#retroactiveBtn"),s=r=>{t.classList.remove("active"),setTimeout(()=>{t.remove(),e(r)},300)};i.addEventListener("click",()=>s(!1)),a.addEventListener("click",()=>s(!0)),t.addEventListener("click",r=>{r.target===t&&s(!1)})})}showSuccess(e){console.log("Success:",e),window.showToast&&window.showToast(e,"success")}rollbackOptimisticCreate(e){try{const t=this.app.employees.findIndex(i=>i.id===e);t!==-1&&(this.app.employees.splice(t,1),this.app.onEmployeesLoaded(),console.log("Rolled back optimistic create for employee:",e))}catch(t){console.error("Error rolling back optimistic create:",t)}}rollbackOptimisticUpdate(e,t){try{e>=0&&e<this.app.employees.length&&(this.app.employees[e]=t,this.app.onEmployeesLoaded(),console.log("Rolled back optimistic update for employee:",t.id))}catch(i){console.error("Error rolling back optimistic update:",i)}}rollbackOptimisticArchive(e,t){try{const i=this.app.employees.findIndex(a=>a.id===t.id);i!==-1?this.app.employees[i]=t:this.app.employees.splice(e,0,t),this.app.onEmployeesLoaded(),console.log("Rolled back optimistic archive for employee:",t.id)}catch(i){console.error("Error rolling back optimistic archive:",i)}}isOptimistic(e){return e&&(e._optimistic===!0||e._loading===!0)}cleanOptimisticFlags(e){const t={...e};return delete t._optimistic,delete t._loading,t}showOptimisticLoading(e="Lagrer..."){console.log("Optimistic operation:",e)}hideOptimisticLoading(){console.log("Optimistic operation completed")}}export{b as EmployeeModal};
