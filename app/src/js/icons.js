// Loads all public icons as raw strings. Usage: mountIcon(el, 'home')
const ICONS = import.meta.glob('/public/icons/*.svg', { as: 'raw', eager: true });
export function mountIcon(el, name){
  const key = `/public/icons/${name}.svg`;
  if (ICONS[key]) el.innerHTML = ICONS[key];
}
export function mountAll(root=document){
  root.querySelectorAll('[data-icon]').forEach(el => mountIcon(el, el.dataset.icon));
}