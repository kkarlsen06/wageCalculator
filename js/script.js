// js/script.js
// Supabase is loaded globally from CDN, access it via window.supabase
const { createClient } = window.supabase;

const supabase = createClient(
  'https://iuwjdacxbirhmsglcbxp.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml1d2pkYWN4YmlyaG1zZ2xjYnhwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg0NTIxNDAsImV4cCI6MjA2NDAyODE0MH0.iSjbvGVpM3zOWCGpg5HrQp37PjJCmiHIwVQLgc2LgcE'
);

// Get the login form
const form = document.querySelector('#loginForm');

if (form) {
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.querySelector('#email').value;
    const password = document.querySelector('#password').value;

    try {
      const { data, error } = await supabase.auth.signInWithPassword({ 
        email, 
        password 
      });
      
      if (error) {
        alert('Login feil: ' + error.message);
        return;
      }
      
      // Login successful, redirect or show app
      console.log('Innlogget:', data);
      // You can redirect to another page or show the app section
      // window.location.href = '/app.html';
      
    } catch (err) {
      console.error('Login error:', err);
      alert('En feil oppstod under innlogging');
    }
  });
}

// Expose logout and supabase on window for other parts of the app
window.logout = () => supabase.auth.signOut();
window.supabase = supabase;
