// ===== server.js =====
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { OpenAI } from 'openai';
import { createClient } from '@supabase/supabase-js';

const app  = express();
app.use(cors());
app.use(express.json());
app.use(express.static('public'));   // serves index.html

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Initialize Supabase client with service role key for server-side operations
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// JWT Authentication Middleware
async function authenticateUser(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing or invalid Authorization header' });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Verify the JWT token with Supabase
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    // Add user_id to request object for use in route handlers
    req.user_id = user.id;
    next();
  } catch (error) {
    console.error('Authentication error:', error);
    return res.status(401).json({ error: 'Authentication failed' });
  }
}

/* One single action GPT may perform */
const functions = [{
  name: "addShift",
  description: "Add one work shift",
  parameters: {
    type: "object",
    properties: {
      shift_date: { type: "string", description: "YYYY-MM-DD" },
      start_time: { type: "string", description: "HH:mm" },
      end_time:   { type: "string", description: "HH:mm" }
    },
    required: ["shift_date","start_time","end_time"]
  }
}];

/* Super-dumb in-memory “database” */


/* Settings endpoint */
app.get('/settings', authenticateUser, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('user_settings')
      .select('hourly_rate')
      .eq('user_id', req.user_id)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 is "no rows returned"
      console.error('Error fetching settings:', error);
      return res.status(500).json({ error: 'Failed to fetch settings' });
    }

    // Return hourly_rate or default to 0 if no settings found
    const hourlyRate = data?.hourly_rate ?? 0;
    res.json({ hourly_rate: hourlyRate });
  } catch (error) {
    console.error('Settings endpoint error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/* Chat endpoint */
app.post('/chat', authenticateUser, async (req, res) => {
  try {
    const { messages } = req.body;

    const gpt = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages,
      functions,
      function_call: "auto"
    });

    const msg = gpt.choices[0].message;

    // Did GPT tell us to add a shift?
    if (msg.function_call) {
      const args = JSON.parse(msg.function_call.arguments);

      // Save shift to Supabase
      const { error } = await supabase
        .from('user_shifts')
        .insert({
          user_id: req.user_id,
          shift_date: args.shift_date,
          start_time: args.start_time,
          end_time: args.end_time,
          shift_type: 0 // Default to regular shift type
        })
        .select();

      if (error) {
        console.error('Error saving shift to Supabase:', error);
        return res.status(500).json({ error: 'Failed to save shift' });
      }

      // Fetch all user shifts to return in response
      const { data: allShifts, error: fetchError } = await supabase
        .from('user_shifts')
        .select('*')
        .eq('user_id', req.user_id)
        .order('shift_date', { ascending: true });

      if (fetchError) {
        console.error('Error fetching shifts:', fetchError);
        return res.status(500).json({ error: 'Failed to fetch shifts' });
      }

      return res.json({
        system: `Shift on ${args.shift_date} ${args.start_time}–${args.end_time} saved.`,
        shifts: allShifts || []
      });
    }

  // Otherwise just relay GPT’s text
    const { data: allShifts, error: fetchError } = await supabase
      .from('user_shifts')
      .select('*')
      .eq('user_id', req.user_id)
      .order('shift_date', { ascending: true });

    if (fetchError) {
      console.error('Error fetching shifts:', fetchError);
      return res.status(500).json({ error: 'Failed to fetch shifts' });
    }

    res.json({ assistant: msg.content, shifts: allShifts || [] });
  } catch (error) {
    console.error('Chat endpoint error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Export app for testing
export default app;

// Also export for CommonJS (for Jest tests)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = app;
}

// Only start server if this file is run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  app.listen(5173, () =>
    console.log('✔ Server running →  http://localhost:5173')
  );
}