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

// ---------- GPT tool schema ----------
const addShiftSchema = {
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
};

const addSeriesSchema = {
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
};

const editShiftSchema = {
  name: 'editShift',
  description: 'Edit an existing work shift by ID or by date+time',
  parameters: {
    type: 'object',
    properties: {
      shift_id: { type: 'integer', description: 'ID of shift to edit (optional if shift_date+start_time provided)' },
      shift_date: { type: 'string', description: 'Date of shift to find/edit YYYY-MM-DD' },
      start_time: { type: 'string', description: 'Start time of shift to find HH:mm' },
      new_start_time: { type: 'string', description: 'New start time HH:mm (optional)' },
      new_end_time: { type: 'string', description: 'New end time HH:mm (optional)' },
      end_time: { type: 'string', description: 'New end time HH:mm (optional, legacy)' }
    },
    required: []
  }
};

const deleteShiftSchema = {
  name: 'deleteShift',
  description: 'Delete a single work shift by ID',
  parameters: {
    type: 'object',
    properties: {
      shift_id: { type: 'integer', description: 'ID of shift to delete' }
    },
    required: ['shift_id']
  }
};

const deleteSeriesSchema = {
  name: 'deleteSeries',
  description: 'Delete multiple shifts by criteria (week, date range, or series)',
  parameters: {
    type: 'object',
    properties: {
      criteria_type: {
        type: 'string',
        enum: ['week', 'date_range', 'series_id'],
        description: 'Type of deletion criteria'
      },
      week_number: { type: 'integer', description: 'Week number (1-53) when criteria_type=week' },
      year: { type: 'integer', description: 'Year for week deletion' },
      from_date: { type: 'string', description: 'Start date YYYY-MM-DD when criteria_type=date_range' },
      to_date: { type: 'string', description: 'End date YYYY-MM-DD when criteria_type=date_range' },
      series_id: { type: 'string', description: 'Series ID when criteria_type=series_id' }
    },
    required: ['criteria_type']
  }
};

const getShiftsSchema = {
  name: 'getShifts',
  description: 'Get existing shifts by criteria (week, date range, next weeks, or all)',
  parameters: {
    type: 'object',
    properties: {
      criteria_type: {
        type: 'string',
        enum: ['week', 'date_range', 'next', 'all'],
        description: 'Type of query criteria'
      },
      week_number: { type: 'integer', description: 'Week number (1-53) when criteria_type=week' },
      year: { type: 'integer', description: 'Year for week query' },
      from_date: { type: 'string', description: 'Start date YYYY-MM-DD when criteria_type=date_range' },
      to_date: { type: 'string', description: 'End date YYYY-MM-DD when criteria_type=date_range' },
      num_weeks: { type: 'integer', description: 'Number of weeks to get when criteria_type=next (default 1)' }
    },
    required: ['criteria_type']
  }
};

const tools = [
  { type: 'function', function: addShiftSchema },
  { type: 'function', function: addSeriesSchema },
  { type: 'function', function: editShiftSchema },
  { type: 'function', function: deleteShiftSchema },
  { type: 'function', function: deleteSeriesSchema },
  { type: 'function', function: getShiftsSchema }
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

function getWeekDateRange(weekNumber, year) {
  // Get first day of year
  const firstDay = new Date(year, 0, 1);

  // Find first Monday of the year (ISO week starts on Monday)
  const firstMonday = new Date(firstDay);
  const dayOfWeek = firstDay.getDay();
  const daysToMonday = dayOfWeek === 0 ? 1 : 8 - dayOfWeek;
  firstMonday.setDate(firstDay.getDate() + daysToMonday);

  // Calculate start of target week
  const weekStart = new Date(firstMonday);
  weekStart.setDate(firstMonday.getDate() + (weekNumber - 1) * 7);

  // Calculate end of target week (Sunday)
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);

  return {
    start: weekStart.toISOString().slice(0, 10),
    end: weekEnd.toISOString().slice(0, 10)
  };
}

function getNextWeeksDateRange(numWeeks = 1) {
  const today = new Date();
  const currentDay = today.getDay();

  // Find start of current week (Monday)
  const startOfCurrentWeek = new Date(today);
  const daysToMonday = currentDay === 0 ? -6 : 1 - currentDay;
  startOfCurrentWeek.setDate(today.getDate() + daysToMonday);

  // Start of next week
  const startOfNextWeek = new Date(startOfCurrentWeek);
  startOfNextWeek.setDate(startOfCurrentWeek.getDate() + 7);

  // End of the period (end of the last requested week)
  const endOfPeriod = new Date(startOfNextWeek);
  endOfPeriod.setDate(startOfNextWeek.getDate() + (numWeeks * 7) - 1);

  return {
    start: startOfNextWeek.toISOString().slice(0, 10),
    end: endOfPeriod.toISOString().slice(0, 10)
  };
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

  // Get user information for personalization
  const { data: { user }, error: userError } = await supabase.auth.getUser(req.headers.authorization?.slice(7));
  let userName = 'bruker';
  if (!userError && user) {
    userName = user.user_metadata?.first_name ||
               user.email?.split('@')[0] ||
               'bruker';
  }

  // Inject relative dates and user name for GPT context
  const today = new Date().toLocaleDateString('no-NO', { timeZone: 'Europe/Oslo' });
  const tomorrow = new Date(Date.now() + 864e5).toLocaleDateString('no-NO', { timeZone: 'Europe/Oslo' });

  const systemContextHint = {
    role: 'system',
    content: `For konteksten: "i dag" = ${today}, "i morgen" = ${tomorrow}. Brukerens navn er ${userName}, så du kan bruke navnet i svarene dine for å gjøre dem mer personlige. Du kan nå legge til, redigere, slette og hente skift. Bruk editShift, deleteShift, deleteSeries eller getShifts ved behov. Du kan redigere et skift ved å oppgi dato og starttid hvis du ikke har ID-en. Bruk editShift direkte med shift_date og start_time for å finne skiftet, og new_start_time/new_end_time for nye tider. Du kan også hente skift med getShifts – for eksempel "hvilke vakter har jeg neste uke" eller "vis alt i uke 42". Når du bruker getShifts og får skift-data i tool-resultatet, presenter listen tydelig på norsk med datoer og tider. VIKTIG: Vis alltid datoer i dd.mm.yyyy format (f.eks. 15.03.2024) når du snakker med brukeren, ikke yyyy-mm-dd format. Bekreft før masse-sletting.`
  };
  const fullMessages = [systemContextHint, ...messages];

  // First call: Let GPT choose tools
  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: fullMessages,
    tools,
    tool_choice: 'auto'
  });

  const choice = completion.choices[0].message;

  if (choice.tool_calls && choice.tool_calls.length > 0) {
    // Handle multiple tool calls
    const toolMessages = [];

    for (const call of choice.tool_calls) {
      const toolResult = await handleTool(call, req.user_id);
      toolMessages.push({
        role: 'tool',
        tool_call_id: call.id,
        name: call.function.name,
        content: toolResult
      });
    }

    // Add tool results to conversation and get GPT's response
    const messagesWithToolResult = [
      ...fullMessages,
      {
        role: 'assistant',
        content: choice.content,
        tool_calls: choice.tool_calls
      },
      ...toolMessages
    ];

    // Second call: Let GPT formulate a user-friendly response with error handling
    let assistantMessage;
    try {
      const secondCompletion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: messagesWithToolResult,
        tools,
        tool_choice: 'none'
      });
      assistantMessage = secondCompletion.choices[0].message.content;
    } catch (error) {
      console.error('Second GPT call failed:', error);
      // Fallback message based on tool results
      const hasSuccess = toolMessages.some(msg => msg.content.startsWith('OK:'));
      const hasError = toolMessages.some(msg => msg.content.startsWith('ERROR:'));

      if (hasError) {
        assistantMessage = 'Det oppstod en feil med en av operasjonene. Prøv igjen.';
      } else if (hasSuccess) {
        assistantMessage = 'Operasjonene er utført! 👍';
      } else {
        assistantMessage = 'Operasjonene er utført.';
      }
    }

    // Get updated shift list
    const { data: shifts } = await supabase
      .from('user_shifts')
      .select('*')
      .eq('user_id', req.user_id)
      .order('shift_date');

    res.json({
      assistant: assistantMessage,
      shifts: shifts || []
    });
  } else {
    // No tool call - just return GPT's direct response
    const assistantMessage = choice.content || "Jeg forstod ikke kommandoen.";

    const { data: shifts } = await supabase
      .from('user_shifts')
      .select('*')
      .eq('user_id', req.user_id)
      .order('shift_date');

    res.json({
      assistant: assistantMessage,
      shifts: shifts || []
    });
  }
});

// ---------- handleTool function ----------
async function handleTool(call, user_id) {
  const fnName = call.function.name;
  const args = JSON.parse(call.function.arguments);
  let toolResult = '';

  if (fnName === 'addShift') {
      // Check for duplicate shift before inserting
      const { data: dupCheck } = await supabase
        .from('user_shifts')
        .select('id')
        .eq('user_id', user_id)
        .eq('shift_date', args.shift_date)
        .eq('start_time', args.start_time)
        .eq('end_time', args.end_time)
        .maybeSingle();

      if (dupCheck) {
        toolResult = 'DUPLICATE: Skiftet eksisterer allerede';
      } else {
        const { error } = await supabase.from('user_shifts').insert({
          user_id:     user_id,
          shift_date:  args.shift_date,
          start_time:  args.start_time,
          end_time:    args.end_time,
          shift_type:  0
        });
        if (error) {
          toolResult = 'ERROR: Failed to save shift';
        } else {
          const hours = hoursBetween(args.start_time, args.end_time);
          toolResult = `OK: Skift lagret (${hours} timer)`;
        }
      }
    }

    if (fnName === 'addSeries') {
      const dates = generateSeriesDates(args.from, args.to, args.days);
      if (!dates.length) {
        toolResult = 'ERROR: No matching dates';
      } else {
        const rows = dates.map(d => ({
          user_id:    user_id,
          shift_date: d.toISOString().slice(0, 10),
          start_time: args.start,
          end_time:   args.end,
          shift_type: 0
        }));

        // Filter out duplicates before inserting
        const { data: existingShifts } = await supabase
          .from('user_shifts')
          .select('shift_date, start_time, end_time')
          .eq('user_id', user_id);

        const existingKeys = new Set(
          existingShifts?.map(s => `${s.shift_date}|${s.start_time}|${s.end_time}`) || []
        );

        const newRows = rows.filter(row =>
          !existingKeys.has(`${row.shift_date}|${row.start_time}|${row.end_time}`)
        );

        if (newRows.length > 0) {
          const { error } = await supabase.from('user_shifts').insert(newRows);
          if (error) {
            toolResult = 'ERROR: Failed to save series';
          } else {
            const totalHours = hoursBetween(args.start, args.end) * newRows.length;
            const duplicates = rows.length - newRows.length;

            if (duplicates > 0) {
              toolResult = `OK: ${newRows.length} nye skift lagret (${totalHours} timer), ${duplicates} eksisterte fra før`;
            } else {
              toolResult = `OK: ${newRows.length} skift lagret (${totalHours} timer)`;
            }
          }
        } else {
          toolResult = `DUPLICATE: Alle ${rows.length} skift eksisterte fra før`;
        }
      }
    }

    if (fnName === 'editShift') {
      let existingShift = null;
      let shiftId = args.shift_id;

      // Find shift by ID or by date+time
      if (args.shift_id) {
        // Find by ID (existing behavior)
        const { data } = await supabase
          .from('user_shifts')
          .select('*')
          .eq('id', args.shift_id)
          .eq('user_id', user_id)
          .maybeSingle();
        existingShift = data;
      } else if (args.shift_date && args.start_time) {
        // Find by date+time (new behavior)
        const { data } = await supabase
          .from('user_shifts')
          .select('*')
          .eq('user_id', user_id)
          .eq('shift_date', args.shift_date)
          .eq('start_time', args.start_time);

        if (!data || data.length === 0) {
          toolResult = 'ERROR: Fant ikke skiftet for den datoen og tiden';
        } else if (data.length > 1) {
          toolResult = 'ERROR: Flere skift funnet for samme dato og tid. Vennligst presiser hvilken du vil redigere';
        } else {
          existingShift = data[0];
          shiftId = existingShift.id;
        }
      } else {
        toolResult = 'ERROR: Du må oppgi enten shift_id eller både shift_date og start_time';
      }

      if (existingShift && !toolResult.startsWith('ERROR:')) {
        // Build update object with only provided fields
        const updateData = {};

        // Handle new field names with fallback to legacy names
        const newStartTime = args.new_start_time || args.start_time;
        const newEndTime = args.new_end_time || args.end_time;

        // Only update shift_date if it's different from current (and not used for finding)
        if (args.shift_date && args.shift_date !== existingShift.shift_date) {
          updateData.shift_date = args.shift_date;
        }
        if (newStartTime && newStartTime !== existingShift.start_time) {
          updateData.start_time = newStartTime;
        }
        if (newEndTime && newEndTime !== existingShift.end_time) {
          updateData.end_time = newEndTime;
        }

        // Check for collision with other shifts (excluding current shift)
        if (Object.keys(updateData).length > 0) {
          const checkDate = updateData.shift_date || existingShift.shift_date;
          const checkStart = updateData.start_time || existingShift.start_time;
          const checkEnd = updateData.end_time || existingShift.end_time;

          const { data: collision } = await supabase
            .from('user_shifts')
            .select('id')
            .eq('user_id', user_id)
            .eq('shift_date', checkDate)
            .eq('start_time', checkStart)
            .eq('end_time', checkEnd)
            .neq('id', shiftId)
            .maybeSingle();

          if (collision) {
            toolResult = 'ERROR: Et skift med samme tid eksisterer allerede';
          } else {
            // Perform update
            const { error } = await supabase
              .from('user_shifts')
              .update(updateData)
              .eq('id', shiftId)
              .eq('user_id', user_id);

            if (error) {
              toolResult = 'ERROR: Kunne ikke oppdatere skiftet';
            } else {
              const finalStart = updateData.start_time || existingShift.start_time;
              const finalEnd = updateData.end_time || existingShift.end_time;
              const hours = hoursBetween(finalStart, finalEnd);
              toolResult = `OK: Skift oppdatert (${hours} timer)`;
            }
          }
        } else {
          toolResult = 'ERROR: Ingen endringer spesifisert';
        }
      } else if (!toolResult.startsWith('ERROR:')) {
        toolResult = 'ERROR: Skiftet ble ikke funnet eller tilhører ikke deg';
      }
    }

    if (fnName === 'deleteShift') {
      // Verify shift exists and belongs to user
      const { data: existingShift } = await supabase
        .from('user_shifts')
        .select('*')
        .eq('id', args.shift_id)
        .eq('user_id', user_id)
        .maybeSingle();

      if (!existingShift) {
        toolResult = 'ERROR: Skiftet ble ikke funnet eller tilhører ikke deg';
      } else {
        // Delete the shift
        const { error } = await supabase
          .from('user_shifts')
          .delete()
          .eq('id', args.shift_id)
          .eq('user_id', user_id);

        if (error) {
          toolResult = 'ERROR: Kunne ikke slette skiftet';
        } else {
          const hours = hoursBetween(existingShift.start_time, existingShift.end_time);
          toolResult = `OK: Skift slettet (${hours} timer)`;
        }
      }
    }

    if (fnName === 'deleteSeries') {
      let deleteQuery = supabase
        .from('user_shifts')
        .delete()
        .eq('user_id', user_id);

      let criteriaDescription = '';

      if (args.criteria_type === 'week') {
        if (!args.week_number || !args.year) {
          toolResult = 'ERROR: Uke-nummer og år må spesifiseres for uke-sletting';
        } else {
          const { start, end } = getWeekDateRange(args.week_number, args.year);
          deleteQuery = deleteQuery.gte('shift_date', start).lte('shift_date', end);
          criteriaDescription = `uke ${args.week_number} i ${args.year}`;
        }
      } else if (args.criteria_type === 'date_range') {
        if (!args.from_date || !args.to_date) {
          toolResult = 'ERROR: Fra-dato og til-dato må spesifiseres for periode-sletting';
        } else {
          deleteQuery = deleteQuery.gte('shift_date', args.from_date).lte('shift_date', args.to_date);
          criteriaDescription = `periode ${args.from_date} til ${args.to_date}`;
        }
      } else if (args.criteria_type === 'series_id') {
        if (!args.series_id) {
          toolResult = 'ERROR: Serie-ID må spesifiseres for serie-sletting';
        } else {
          deleteQuery = deleteQuery.eq('series_id', args.series_id);
          criteriaDescription = `serie ${args.series_id}`;
        }
      } else {
        toolResult = 'ERROR: Ugyldig slette-kriterium';
      }

      // Only proceed if no error so far
      if (!toolResult.startsWith('ERROR:')) {
        // First, count how many shifts will be deleted
        let countQuery = supabase
          .from('user_shifts')
          .select('*', { count: 'exact' })
          .eq('user_id', user_id);

        if (args.criteria_type === 'week') {
          const { start, end } = getWeekDateRange(args.week_number, args.year);
          countQuery = countQuery.gte('shift_date', start).lte('shift_date', end);
        } else if (args.criteria_type === 'date_range') {
          countQuery = countQuery.gte('shift_date', args.from_date).lte('shift_date', args.to_date);
        } else if (args.criteria_type === 'series_id') {
          countQuery = countQuery.eq('series_id', args.series_id);
        }

        const { count, error: countError } = await countQuery;

        if (countError) {
          toolResult = 'ERROR: Kunne ikke telle skift for sletting';
        } else if (count === 0) {
          toolResult = `ERROR: Ingen skift funnet for ${criteriaDescription}`;
        } else {
          // Perform the deletion
          const { error } = await deleteQuery;

          if (error) {
            toolResult = 'ERROR: Kunne ikke slette skiftene';
          } else {
            toolResult = `OK: ${count} skift slettet for ${criteriaDescription}`;
          }
        }
      }
    }

    if (fnName === 'getShifts') {
      let selectQuery = supabase
        .from('user_shifts')
        .select('*')
        .eq('user_id', user_id)
        .order('shift_date');

      let criteriaDescription = '';

      if (args.criteria_type === 'week') {
        if (!args.week_number || !args.year) {
          toolResult = 'ERROR: Uke-nummer og år må spesifiseres for uke-spørring';
        } else {
          const { start, end } = getWeekDateRange(args.week_number, args.year);
          selectQuery = selectQuery.gte('shift_date', start).lte('shift_date', end);
          criteriaDescription = `uke ${args.week_number} i ${args.year}`;
        }
      } else if (args.criteria_type === 'date_range') {
        if (!args.from_date || !args.to_date) {
          toolResult = 'ERROR: Fra-dato og til-dato må spesifiseres for periode-spørring';
        } else {
          selectQuery = selectQuery.gte('shift_date', args.from_date).lte('shift_date', args.to_date);
          criteriaDescription = `periode ${args.from_date} til ${args.to_date}`;
        }
      } else if (args.criteria_type === 'next') {
        const numWeeks = args.num_weeks || 1;
        const { start, end } = getNextWeeksDateRange(numWeeks);
        selectQuery = selectQuery.gte('shift_date', start).lte('shift_date', end);
        criteriaDescription = numWeeks === 1 ? 'neste uke' : `neste ${numWeeks} uker`;
      } else if (args.criteria_type === 'all') {
        criteriaDescription = 'alle skift';
        // No additional filters needed for 'all'
      } else {
        toolResult = 'ERROR: Ugyldig spørring-kriterium';
      }

      // Only proceed if no error so far
      if (!toolResult.startsWith('ERROR:')) {
        const { data: shifts, error } = await selectQuery;

        if (error) {
          toolResult = 'ERROR: Kunne ikke hente skift';
        } else if (!shifts || shifts.length === 0) {
          toolResult = `NONE: Ingen skift funnet for ${criteriaDescription}`;
        } else {
          // Calculate total hours
          const totalHours = shifts.reduce((sum, shift) => {
            return sum + hoursBetween(shift.start_time, shift.end_time);
          }, 0);

          // Format shifts for tool content (YYYY-MM-DD HH:mm-HH:mm)
          const formattedShifts = shifts.map(shift =>
            `${shift.shift_date} ${shift.start_time}-${shift.end_time}`
          ).join(', ');

          toolResult = `OK: ${shifts.length} skift funnet for ${criteriaDescription} (${totalHours} timer totalt). Skift: ${formattedShifts}`;
        }
      }
    }

    return toolResult;
}

// ---------- export / run ----------
export default app;

if (import.meta.url === `file://${process.argv[1]}`) {
  app.listen(5173, () =>
    console.log('✔ Server running → http://localhost:5173')
  );
}