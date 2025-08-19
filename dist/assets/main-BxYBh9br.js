import"./modulepreload-polyfill-B5Qt9EMX.js";import"./error-handling-Do_n41nE.js";const p=window.location.hash,w=window.location.search,f=new URLSearchParams(w),h=p.includes("access_token")&&p.includes("type=recovery"),g=w.includes("access_token")&&w.includes("type=recovery"),x=f.has("token")&&f.get("type")==="recovery";if(h||g||x){const e="/kalkulator/index.html";h?window.location.href=e+p:window.location.href=e+w}(function(){"scrollRestoration"in history&&(history.scrollRestoration="manual");const e=()=>{window.scrollTo(0,0),document.documentElement.scrollTop=0,document.body.scrollTop=0};window.location.hash&&window.location.hash!=="#"&&history.replaceState(null,null,window.location.pathname+window.location.search),e(),setTimeout(e,50)})();window.addEventListener("beforeunload",()=>{window.scrollTo(0,0)});setTimeout(()=>{},500);document.addEventListener("DOMContentLoaded",()=>{window.scrollTo(0,0),b()});async function b(){E(),await new Promise(e=>setTimeout(e,100)),L(),await new Promise(e=>setTimeout(e,150)),S(),await new Promise(e=>setTimeout(e,100)),await new Promise(e=>setTimeout(e,100)),T(),await new Promise(e=>setTimeout(e,50)),P(),await new Promise(e=>setTimeout(e,50)),k()}function E(){const e=document.querySelector(".navbar");if(!e)return;let n=0,t=!1;const o=()=>{const i=window.pageYOffset;i>50?(e.style.background="rgba(10, 10, 11, 0.95)",e.style.backdropFilter="blur(30px)"):(e.style.background="rgba(10, 10, 11, 0.8)",e.style.backdropFilter="blur(20px)"),i>n&&i>200?e.style.transform="translateY(-100%)":e.style.transform="translateY(0)",n=i,t=!1};window.addEventListener("scroll",()=>{t||(requestAnimationFrame(o),t=!0)}),document.querySelectorAll(".nav-link").forEach(i=>{i.addEventListener("click",s=>{const a=i.getAttribute("href");if(a.startsWith("#")){s.preventDefault();const r=document.querySelector(a);r&&r.scrollIntoView({behavior:"smooth"})}})})}function L(){const e={threshold:.1,rootMargin:"0px 0px -100px 0px"},n=new IntersectionObserver(t=>{t.forEach(o=>{o.isIntersecting&&requestAnimationFrame(()=>{o.target.classList.add("animate-in"),o.target.querySelectorAll(".animate-child").forEach((s,a)=>{setTimeout(()=>{requestAnimationFrame(()=>{s.classList.add("animate-in")})},a*60)})})})},e);document.querySelectorAll(".section-header, .tech-card, .feature-item").forEach(t=>{t.classList.add("animate-element"),n.observe(t)})}function S(){const e=document.querySelectorAll(".gradient-orb");if(!e.length)return;let n=!1;const t=s=>{const a=s.clientX/window.innerWidth,r=s.clientY/window.innerHeight;e.forEach((l,d)=>{const u=(d+1)*.2,m=(a-.5)*u*30,c=(r-.5)*u*30;l.style.setProperty("--mouse-x",`${m}px`),l.style.setProperty("--mouse-y",`${c}px`)}),n=!1};window.addEventListener("mousemove",s=>{n||(requestAnimationFrame(()=>t(s)),n=!0)});let o=!1;const i=()=>{const s=window.pageYOffset;e.forEach((a,r)=>{const l=(r+1)*.1;a.style.setProperty("--scroll-y",`${s*l}px`)}),o=!1};window.addEventListener("scroll",()=>{o||(requestAnimationFrame(i),o=!0)})}function T(){document.querySelectorAll(".btn").forEach(e=>{e.addEventListener("click",function(n){const t=document.createElement("span"),o=this.getBoundingClientRect(),i=Math.max(o.width,o.height),s=n.clientX-o.left-i/2,a=n.clientY-o.top-i/2;t.style.width=t.style.height=i+"px",t.style.left=s+"px",t.style.top=a+"px",t.classList.add("ripple"),this.appendChild(t),setTimeout(()=>t.remove(),600)})}),window.innerWidth>768&&document.querySelectorAll(".tech-card, .floating-card").forEach(e=>{let n=!1;e.addEventListener("mousemove",t=>{n||(n=!0,requestAnimationFrame(()=>{const o=e.getBoundingClientRect(),i=t.clientX-o.left,s=t.clientY-o.top,a=o.width/2,r=o.height/2,l=(s-r)/10,d=(a-i)/10;e.style.transform=`perspective(1000px) rotateX(${l}deg) rotateY(${d}deg)`,n=!1}))}),e.addEventListener("mouseleave",()=>{requestAnimationFrame(()=>{e.style.transform="perspective(1000px) rotateX(0) rotateY(0)"})})})}function P(){const e=document.querySelector(".nav-toggle"),n=document.querySelector(".nav-menu");e&&n&&e.addEventListener("click",()=>{n.classList.toggle("active"),e.classList.toggle("active")})}function k(){const e=document.querySelector(".hero-stats");if(!e)return;let n=null,t=null,o=null,i=!1,s=0;const a=()=>{window.innerWidth<=768&&(e.style.left="50%",e.style.transform="translateX(-50%)",e.style.position="fixed",e.style.opacity="1",e.style.display="flex")},r=()=>{if(window.visualViewport){const c=window.visualViewport.height<window.innerHeight?window.innerHeight-window.visualViewport.height:0;e.style.bottom=`calc(var(--space-md) + ${c}px)`}a()},l=y(()=>{if(!i)return;const c=window.innerHeight;s-c>150?e.style.display="none":e.style.display="flex"},100),d=()=>{n&&window.visualViewport&&(window.visualViewport.removeEventListener("resize",n),n=null),t&&window.visualViewport&&(window.visualViewport.removeEventListener("scroll",t),t=null),o&&(window.removeEventListener("resize",o),o=null)},u=()=>{window.visualViewport&&(n=r,t=r,window.visualViewport.addEventListener("resize",n),window.visualViewport.addEventListener("scroll",t),r()),o=l,window.addEventListener("resize",o)},m=()=>{const c=window.innerWidth<=768;c!==i&&(d(),i=c,i?(s=window.innerHeight,a(),u()):(e.style.bottom="",e.style.display="",e.style.left="",e.style.transform="",e.style.position="",e.style.opacity=""))};m(),i&&(s=window.innerHeight),a(),window.addEventListener("resize",y(m,100))}function y(e,n){let t;return function(...i){const s=()=>{clearTimeout(t),e(...i)};clearTimeout(t),t=setTimeout(s,n)}}const q=`
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
`,v=document.createElement("style");v.textContent=q;document.head.appendChild(v);"performance"in window&&window.addEventListener("load",()=>{const e=window.performance.timing,n=e.loadEventEnd-e.navigationStart;console.log(`Page load time: ${n}ms`)});
