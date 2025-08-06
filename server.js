// ===== server.js =====
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { OpenAI } from 'openai';
import { createClient } from '@supabase/supabase-js';

// ---------- path helpers ----------
const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);
const FRONTEND_DIR = __dirname;

// ---------- app & core middleware ----------
const app = express();
app.use(express.static(FRONTEND_DIR)); // serve index.html, css, js, etc.
app.use(cors());
app.use(express.json());

// ---------- third-party clients ----------
const openai   = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// ---------- auth middleware ----------
async function authenticateUser(req, res, next) {
  const auth = req.headers.authorization || '';
  if (!auth.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid Authorization header' });
  }
  const token = auth.slice(7);

  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return res.status(401).json({ error: 'Invalid or expired token' });

  req.user_id = user.id;
  next();
}

// ---------- GPT function schema ----------
const functions = [
  {
    name: 'addShift',
    description: 'Add one work shift',
    parameters: {
      type: 'object',
      properties: {
        shift_date: { type: 'string', description: 'YYYY-MM-DD' },
        start_time: { type: 'string', description: 'HH:mm' },
        end_time:   { type: 'string', description: 'HH:mm' }
      },
      required: ['shift_date', 'start_time', 'end_time']
    }
  },
  {
    name: 'addSeries',
    description: 'Add multiple identical shifts over a date range',
    parameters: {
      type: 'object',
      properties: {
        from:  { type: 'string', description: 'First day YYYY-MM-DD' },
        to:    { type: 'string', description: 'Last day YYYY-MM-DD (inclusive)' },
        days:  { type: 'array',  items: { type: 'integer' }, description: 'Weekdays 0-6' },
        start: { type: 'string', description: 'Shift start HH:mm' },
        end:   { type: 'string', description: 'Shift end   HH:mm' }
      },
      required: ['from', 'to', 'days', 'start', 'end']
    }
  }
];

// ---------- helpers ----------
function generateSeriesDates(from, to, days) {
  const start = new Date(`${from}T00:00:00Z`);
  const end   = new Date(`${to}T00:00:00Z`);
  const out   = [];

  for (let d = new Date(start); d <= end; d.setUTCDate(d.getUTCDate() + 1)) {
    if (days.includes(d.getUTCDay())) out.push(new Date(d));
  }
  return out;
}
function hoursBetween(start, end) {
  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  return ((eh * 60 + em) - (sh * 60 + sm)) / 60;
}

// ---------- /settings ----------
app.get('/settings', authenticateUser, async (req, res) => {
  const { data, error } = await supabase
    .from('user_settings')
    .select('hourly_rate')
    .eq('user_id', req.user_id)
    .single();

  if (error && error.code !== 'PGRST116')           // ignore “no rows”
    return res.status(500).json({ error: 'Failed to fetch settings' });

  res.json({ hourly_rate: data?.hourly_rate ?? 0 });
});

// ---------- /chat ----------
app.post('/chat', authenticateUser, async (req, res) => {
  const { messages } = req.body;

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages,
    functions,
    function_call: 'auto'
  });

  const choice = completion.choices[0].message;
  let systemMessage = null;

  if (choice.function_call) {
    const { name, arguments: argStr } = choice.function_call;
    const args = JSON.parse(argStr);

    if (name === 'addShift') {
      // Check for duplicate shift before inserting
      const { data: dupCheck } = await supabase
        .from('user_shifts')
        .select('id')
        .eq('user_id', req.user_id)
        .eq('shift_date', args.shift_date)
        .eq('start_time', args.start_time)
        .eq('end_time', args.end_time)
        .maybeSingle();

      if (dupCheck) {
        // Get all shifts to return with system message
        const { data: allShifts } = await supabase
          .from('user_shifts')
          .select('*')
          .eq('user_id', req.user_id)
          .order('shift_date');

        return res.json({
          system: "Skiftet finnes fra før.",
          shifts: allShifts || []
        });
      }

      const { error } = await supabase.from('user_shifts').insert({
        user_id:     req.user_id,
        shift_date:  args.shift_date,
        start_time:  args.start_time,
        end_time:    args.end_time,
        shift_type:  0
      });
      if (error) return res.status(500).json({ error: 'Failed to save shift' });
    }

    if (name === 'addSeries') {
      const dates = generateSeriesDates(args.from, args.to, args.days);
      if (!dates.length) return res.status(400).json({ error: 'No matching dates' });

      const rows = dates.map(d => ({
        user_id:    req.user_id,
        shift_date: d.toISOString().slice(0, 10),
        start_time: args.start,
        end_time:   args.end,
        shift_type: 0
      }));

      // Filter out duplicates before inserting
      const { data: existingShifts } = await supabase
        .from('user_shifts')
        .select('shift_date, start_time, end_time')
        .eq('user_id', req.user_id);

      const existingKeys = new Set(
        existingShifts?.map(s => `${s.shift_date}|${s.start_time}|${s.end_time}`) || []
      );

      const newRows = rows.filter(row =>
        !existingKeys.has(`${row.shift_date}|${row.start_time}|${row.end_time}`)
      );

      if (newRows.length === 0) {
        // All dates already exist - return system message
        const { data: allShifts } = await supabase
          .from('user_shifts')
          .select('*')
          .eq('user_id', req.user_id)
          .order('shift_date');

        return res.json({
          system: "Added 0 shifts – alle eksisterte fra før.",
          shifts: allShifts || []
        });
      }

      if (newRows.length > 0) {
        const { error } = await supabase.from('user_shifts').insert(newRows);
        if (error) return res.status(500).json({ error: 'Failed to save series' });
      }

      const totalHours = hoursBetween(args.start, args.end) * newRows.length;
      choice.content = `Added ${newRows.length} shifts, total ${totalHours} hours.`;
    }
  }

  // Guarantee fallback - ensure we always have content to return
  if (!choice.content && !choice.function_call) {
    choice.content = "Jeg forstod ikke kommandoen.";
  }

  // always return updated shift list + assistant message
  const { data: shifts } = await supabase
    .from('user_shifts')
    .select('*')
    .eq('user_id', req.user_id)
    .order('shift_date');

  res.json({
    assistant: choice.content || systemMessage,
    shifts: shifts || []
  });
});

// ---------- export / run ----------
export default app;

if (import.meta.url === `file://${process.argv[1]}`) {
  app.listen(5173, () =>
    console.log('✔ Server running → http://localhost:5173')
  );
}