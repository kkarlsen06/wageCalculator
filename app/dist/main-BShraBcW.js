import"./chunks/modulepreload-polyfill-B5Qt9EMX.js";import{L as f}from"./chunks/legal-modal-BGYhwCIo.js";import"./chunks/apiBase-C8RWFuli.js";import"./chunks/error-handling-BcaxJS6j.js";(function(){"scrollRestoration"in history&&(history.scrollRestoration="manual");const e=()=>{window.scrollTo(0,0),document.documentElement.scrollTop=0,document.body.scrollTop=0};window.location.hash&&window.location.hash!=="#"&&history.replaceState(null,null,window.location.pathname+window.location.search),e(),setTimeout(e,50)})();window.addEventListener("beforeunload",()=>{window.scrollTo(0,0)});setTimeout(()=>{},500);document.addEventListener("DOMContentLoaded",()=>{window.scrollTo(0,0),h()});async function h(){g(),await new Promise(e=>setTimeout(e,100)),y(),await new Promise(e=>setTimeout(e,150)),v(),await new Promise(e=>setTimeout(e,100)),await new Promise(e=>setTimeout(e,100)),b(),await new Promise(e=>setTimeout(e,50)),x(),await new Promise(e=>setTimeout(e,50)),E()}function g(){const e=document.querySelector(".navbar");if(!e)return;let i=0,o=!1;const r=()=>{const a=window.pageYOffset;a>50?(e.style.background="rgba(10, 10, 11, 0.95)",e.style.backdropFilter="blur(30px)"):(e.style.background="rgba(10, 10, 11, 0.8)",e.style.backdropFilter="blur(20px)"),a>i&&a>200?e.style.transform="translateY(-100%)":e.style.transform="translateY(0)",i=a,o=!1};window.addEventListener("scroll",()=>{o||(requestAnimationFrame(r),o=!0)}),document.querySelectorAll(".nav-link").forEach(a=>{a.addEventListener("click",n=>{const t=a.getAttribute("href");if(t.startsWith("#")){n.preventDefault();const s=document.querySelector(t);s&&s.scrollIntoView({behavior:"smooth"})}})})}function y(){const e={threshold:.1,rootMargin:"0px 0px -100px 0px"},i=new IntersectionObserver(o=>{o.forEach(r=>{r.isIntersecting&&requestAnimationFrame(()=>{r.target.classList.add("animate-in"),r.target.querySelectorAll(".animate-child").forEach((n,t)=>{setTimeout(()=>{requestAnimationFrame(()=>{n.classList.add("animate-in")})},t*60)})})})},e);document.querySelectorAll(".section-header, .tech-card, .feature-item").forEach(o=>{o.classList.add("animate-element"),i.observe(o)})}function v(){const e=document.querySelectorAll(".gradient-orb");if(!e.length)return;let i=!1;const o=n=>{const t=n.clientX/window.innerWidth,s=n.clientY/window.innerHeight;e.forEach((l,d)=>{const u=(d+1)*.2,m=(t-.5)*u*30,c=(s-.5)*u*30;l.style.setProperty("--mouse-x",`${m}px`),l.style.setProperty("--mouse-y",`${c}px`)}),i=!1};window.addEventListener("mousemove",n=>{i||(requestAnimationFrame(()=>o(n)),i=!0)});let r=!1;const a=()=>{const n=window.pageYOffset;e.forEach((t,s)=>{const l=(s+1)*.1;t.style.setProperty("--scroll-y",`${n*l}px`)}),r=!1};window.addEventListener("scroll",()=>{r||(requestAnimationFrame(a),r=!0)})}function b(){document.querySelectorAll(".btn").forEach(e=>{e.addEventListener("click",function(i){const o=document.createElement("span"),r=this.getBoundingClientRect(),a=Math.max(r.width,r.height),n=i.clientX-r.left-a/2,t=i.clientY-r.top-a/2;o.style.width=o.style.height=a+"px",o.style.left=n+"px",o.style.top=t+"px",o.classList.add("ripple"),this.appendChild(o),setTimeout(()=>o.remove(),600)})}),window.innerWidth>768&&document.querySelectorAll(".tech-card, .floating-card").forEach(e=>{let i=!1;e.addEventListener("mousemove",o=>{i||(i=!0,requestAnimationFrame(()=>{const r=e.getBoundingClientRect(),a=o.clientX-r.left,n=o.clientY-r.top,t=r.width/2,s=r.height/2,l=(n-s)/10,d=(t-a)/10;e.style.transform=`perspective(1000px) rotateX(${l}deg) rotateY(${d}deg)`,i=!1}))}),e.addEventListener("mouseleave",()=>{requestAnimationFrame(()=>{e.style.transform="perspective(1000px) rotateX(0) rotateY(0)"})})})}function x(){const e=document.querySelector(".nav-toggle"),i=document.querySelector(".nav-menu");e&&i&&e.addEventListener("click",()=>{i.classList.toggle("active"),e.classList.toggle("active")})}function E(){const e=document.querySelector(".hero-stats");if(!e)return;let i=null,o=null,r=null,a=!1,n=0;const t=()=>{window.innerWidth<=768&&(e.style.left="50%",e.style.transform="translateX(-50%)",e.style.position="fixed",e.style.opacity="1",e.style.display="flex")},s=()=>{if(window.visualViewport){const c=window.visualViewport.height<window.innerHeight?window.innerHeight-window.visualViewport.height:0;e.style.bottom=`calc(var(--space-md) + ${c}px)`}t()},l=w(()=>{if(!a)return;const c=window.innerHeight;n-c>150?e.style.display="none":e.style.display="flex"},100),d=()=>{i&&window.visualViewport&&(window.visualViewport.removeEventListener("resize",i),i=null),o&&window.visualViewport&&(window.visualViewport.removeEventListener("scroll",o),o=null),r&&(window.removeEventListener("resize",r),r=null)},u=()=>{window.visualViewport&&(i=s,o=s,window.visualViewport.addEventListener("resize",i),window.visualViewport.addEventListener("scroll",o),s()),r=l,window.addEventListener("resize",r)},m=()=>{const c=window.innerWidth<=768;c!==a&&(d(),a=c,a?(n=window.innerHeight,t(),u()):(e.style.bottom="",e.style.display="",e.style.left="",e.style.transform="",e.style.position="",e.style.opacity=""))};m(),a&&(n=window.innerHeight),t(),window.addEventListener("resize",w(m,100))}function w(e,i){let o;return function(...a){const n=()=>{clearTimeout(o),e(...a)};clearTimeout(o),o=setTimeout(n,i)}}const L=`
    .animate-element {
        opacity: 0;
        transform: translateY(30px);
        transition: all 0.4s ease-out; /* Reduced from 0.8s */
    }

    .animate-element.animate-in {
        opacity: 1;
        transform: translateY(0);
    }

    .animate-child {
        opacity: 0;
        transform: translateX(-20px);
        transition: all 0.3s ease-out; /* Reduced from 0.6s */
    }

    .animate-child.animate-in {
        opacity: 1;
        transform: translateX(0);
    }
    
    .ripple {
        position: absolute;
        border-radius: 50%;
        background: rgba(255, 255, 255, 0.5);
        transform: scale(0);
        animation: ripple-animation 0.6s ease-out;
        pointer-events: none;
    }
    
    @keyframes ripple-animation {
        to {
            transform: scale(4);
            opacity: 0;
        }
    }
    
    .nav-menu.active {
        display: flex !important;
        position: fixed;
        top: 60px;
        right: 20px;
        flex-direction: column;
        background: var(--bg-card);
        padding: var(--space-lg);
        border-radius: 12px;
        box-shadow: var(--shadow-xl);
        border: 1px solid var(--border-color);
    }
    
    .nav-toggle.active span:nth-child(1) {
        transform: rotate(45deg) translate(5px, 5px);
    }
    
    .nav-toggle.active span:nth-child(2) {
        opacity: 0;
    }
    
    .nav-toggle.active span:nth-child(3) {
        transform: rotate(-45deg) translate(7px, -6px);
    }
`,p=document.createElement("style");p.textContent=L;document.head.appendChild(p);"performance"in window&&window.addEventListener("load",()=>{const e=window.performance.timing,i=e.loadEventEnd-e.navigationStart;console.log(`Page load time: ${i}ms`)});document.addEventListener("DOMContentLoaded",()=>{try{const n=new URLSearchParams(window.location.search),t=n.get("checkout");t&&window.ErrorHelper&&(t==="success"?window.ErrorHelper.showSuccess("Betaling fullført!"):(t==="cancel"||t==="error"||t==="failed")&&window.ErrorHelper.showError("Betaling ble avbrutt eller feilet."),n.delete("checkout"));const s=n.get("portal");if(s&&window.ErrorHelper&&(s==="done"&&window.ErrorHelper.showSuccess("Abonnement oppdatert!"),n.delete("portal")),t||s){const l=window.location.origin+window.location.pathname+(n.toString()?`?${n}`:"");window.history.replaceState({},document.title,l)}}catch{}const e=new f;try{const n=window.location.pathname.replace(/\/+$/,"");n==="/privacy"?(e.showFromLandingPage(),e.switchTab("privacy")):n==="/terms"&&(e.showFromLandingPage(),e.switchTab("terms"))}catch{}const i=document.querySelector(".footer");if(i){const n=i.querySelector(".footer-links");if(n){const t=document.createElement("button");t.type="button",t.className="btn btn-secondary",t.setAttribute("aria-label","Åpne personvernerklæringen"),t.textContent="Personvernerklæring",t.addEventListener("click",s=>{s.preventDefault(),e.showFromLandingPage(),e.switchTab("privacy")}),n.appendChild(t)}}const o=document.querySelectorAll("[data-legal]");o.length&&o.forEach(n=>{n.addEventListener("click",t=>{t.preventDefault();const s=n.getAttribute("data-legal")==="terms"?"terms":"privacy";e.showFromLandingPage(),e.switchTab(s)})});const r=()=>{const n=document.querySelector(".tagline"),t=document.querySelector(".open-app-btn");if(!n||!t)return;window.innerWidth<=600?requestAnimationFrame(()=>{const l=n.getBoundingClientRect(),d=Math.ceil(l.width*(2/3)),u=t.style.width;t.style.width="auto";const m=Math.ceil(t.getBoundingClientRect().width);t.style.width=u;const c=Math.max(d,m);t.style.width=c>0?`${c}px`:"",t.style.maxWidth="100%"}):(t.style.width="",t.style.maxWidth="")};let a;window.addEventListener("resize",()=>{clearTimeout(a),a=setTimeout(r,100)}),window.addEventListener("orientationchange",()=>setTimeout(r,150)),r()});
