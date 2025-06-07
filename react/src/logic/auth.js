import supabase from '../lib/supabaseClient'

export const auth = {
  // Logg inn med e-post og passord
  async signIn(email, password) {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      
      if (error) {
        throw error
      }
      
      return { user: data.user, session: data.session, error: null }
    } catch (error) {
      console.error('Sign in error:', error)
      return { user: null, session: null, error: error.message }
    }
  },

  // Opprett ny bruker
  async signUp(email, password, firstName) {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            first_name: firstName,
          }
        }
      })
      
      if (error) {
        throw error
      }
      
      return { user: data.user, session: data.session, error: null }
    } catch (error) {
      console.error('Sign up error:', error)
      return { user: null, session: null, error: error.message }
    }
  },

  // Tilbakestill passord
  async resetPassword(email) {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      })
      
      if (error) {
        throw error
      }
      
      return { error: null }
    } catch (error) {
      console.error('Password reset error:', error)
      return { error: error.message }
    }
  },

  // Hent innlogget bruker
  async getUser() {
    try {
      const { data: { user }, error } = await supabase.auth.getUser()
      
      if (error) {
        throw error
      }
      
      return { user, error: null }
    } catch (error) {
      console.error('Get user error:', error)
      return { user: null, error: error.message }
    }
  },

  // Logg ut
  async signOut() {
    try {
      const { error } = await supabase.auth.signOut()
      
      if (error) {
        throw error
      }
      
      return { error: null }
    } catch (error) {
      console.error('Sign out error:', error)
      return { error: error.message }
    }
  },

  // Hent gjeldende session
  async getSession() {
    try {
      const { data: { session }, error } = await supabase.auth.getSession()
      
      if (error) {
        throw error
      }
      
      return { session, error: null }
    } catch (error) {
      console.error('Get session error:', error)
      return { session: null, error: error.message }
    }
  },

  // Oppdater brukerdata
  async updateUserProfile(updates) {
    try {
      const { data, error } = await supabase.auth.updateUser({
        data: updates
      })
      
      if (error) {
        throw error
      }
      
      return { user: data.user, error: null }
    } catch (error) {
      console.error('Update profile error:', error)
      return { user: null, error: error.message }
    }
  }
}
