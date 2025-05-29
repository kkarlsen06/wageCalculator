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
      
      // Login successful, hide login form and show app
      console.log('Innlogget:', data);
      
      // Hide login form
      document.querySelector('#loginForm').style.display = 'none';
      
      // Show the app
      document.querySelector('#app').style.display = 'block';
      
    } catch (err) {
      console.error('Login error:', err);
      alert('En feil oppstod under innlogging');
    }
  });
}

// Expose logout and supabase on window for other parts of the app
window.logout = () => {
  supabase.auth.signOut().then(() => {
    // Show login form again
    document.querySelector('#loginForm').style.display = 'block';
    // Hide the app
    document.querySelector('#app').style.display = 'none';
  });
};
window.supabase = supabase;

// Check if user is already logged in when page loads
supabase.auth.getSession().then(({ data: { session } }) => {
  if (session) {
    // User is logged in, hide login form and show app
    document.querySelector('#loginForm').style.display = 'none';
    document.querySelector('#app').style.display = 'block';
  }
});

// Listen for auth state changes
supabase.auth.onAuthStateChange((event, session) => {
  if (event === 'SIGNED_OUT') {
    // Show login form
    document.querySelector('#loginForm').style.display = 'block';
    // Hide the app
    document.querySelector('#app').style.display = 'none';
  }
});
