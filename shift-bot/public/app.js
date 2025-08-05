const log   = document.getElementById('log');
const input = document.getElementById('input');
const send  = document.getElementById('send');

let messages = [
  { role: 'system', content: 'You are a helpful wage-bot.' }
];

function append(role, text) {
  log.insertAdjacentHTML('beforeend',
    `<p><strong>${role}:</strong> ${text}</p>`);
  log.scrollTop = log.scrollHeight;
}

send.onclick = async () => {
  const txt = input.value.trim();
  if (!txt) return;
  append('user', txt);
  messages.push({ role: 'user', content: txt });
  input.value = '';

  const res = await fetch('/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages })
  }).then(r => r.json());

  if (res.assistant) {
    append('assistant', res.assistant);
    messages.push({ role: 'assistant', content: res.assistant });
  } else if (res.system) {
    append('assistant', res.system);
    console.table(res.shifts); // Replace with your wage calc update
  }
};