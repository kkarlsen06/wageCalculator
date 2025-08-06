// ===== Netlify Function: chat.js =====
import 'dotenv/config';
import { OpenAI } from 'openai';
import { createClient } from '@supabase/supabase-js';

// ---------- third-party clients ----------
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// ---------- auth helper ----------
async function authenticateUser(headers) {
  // Dev-mode fallback for local development
  if (process.env.DEV_BYPASS && process.env.NODE_ENV !== 'production') {
    return process.env.DEV_USER_ID;  // sett til din UUID i .env
  }

  const auth = headers.authorization || '';
  if (!auth.startsWith('Bearer ')) {
    throw new Error('Missing or invalid Authorization header');
  }
  const token = auth.slice(7);

  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) throw new Error('Invalid or expired token');

  return user.id;
}

// ---------- GPT tool schemas ----------
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
      end:   { type: 'string', description: 'Shift end   HH:mm' },
      interval_weeks: { type: 'integer', description: 'Interval in weeks (1=every week, 2=every other week, etc.)', default: 1 },
      offset_start: { type: 'integer', description: 'Week offset from start date (0=no offset)', default: 0 }
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
  description: 'Delete multiple shifts by week number and year, or automatically delete next week if no parameters provided',
  parameters: {
    type: 'object',
    properties: {
      week_number: { type: 'integer', description: 'Week number (1-53, optional - if not provided, deletes next week)' },
      year: { type: 'integer', description: 'Year (optional - if not provided, uses current year or next year for next week)' }
    },
    required: []
  }
};

const getShiftsSchema = {
  name: 'getShifts',
  description: 'Get shifts for a specific time period',
  parameters: {
    type: 'object',
    properties: {
      period: { type: 'string', enum: ['today', 'tomorrow', 'this_week', 'next_week', 'this_month', 'next_month'], description: 'Time period to get shifts for' },
      specific_date: { type: 'string', description: 'Specific date YYYY-MM-DD (optional, overrides period)' },
      date_from: { type: 'string', description: 'Start date YYYY-MM-DD for custom range (optional)' },
      date_to: { type: 'string', description: 'End date YYYY-MM-DD for custom range (optional)' }
    },
    required: []
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

// ---------- helper functions ----------
function generateSeriesDates(from, to, days, intervalWeeks = 1, offsetStart = 0) {
  const start = new Date(`${from}T00:00:00Z`);
  const end   = new Date(`${to}T00:00:00Z`);
  const out   = [];

  // Calculate the reference week (week 0) based on start date and offset
  const referenceDate = new Date(start);
  referenceDate.setUTCDate(referenceDate.getUTCDate() + (offsetStart * 7));

  // Get the Monday of the reference week
  const referenceMonday = new Date(referenceDate);
  const dayOfWeek = referenceDate.getUTCDay();
  const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Sunday = 0, so 6 days back to Monday
  referenceMonday.setUTCDate(referenceDate.getUTCDate() - daysToMonday);

  for (let d = new Date(start); d <= end; d.setUTCDate(d.getUTCDate() + 1)) {
    if (days.includes(d.getUTCDay())) {
      // Calculate which week this date is in relative to reference Monday
      const daysDiff = Math.floor((d.getTime() - referenceMonday.getTime()) / (24 * 60 * 60 * 1000));
      const weekNumber = Math.floor(daysDiff / 7);

      // Only include if this week matches the interval pattern
      if (weekNumber >= 0 && weekNumber % intervalWeeks === 0) {
        out.push(new Date(d));
      }
    }
  }
  return out;
}

function hoursBetween(start, end) {
  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  return ((eh * 60 + em) - (sh * 60 + sm)) / 60;
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

function getWeekNumber(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}

function getDateRangeForWeek(weekNumber, year) {
  // Create January 4th of the given year (always in week 1)
  const jan4 = new Date(year, 0, 4);

  // Find the Monday of week 1
  const dayOfWeek = jan4.getDay();
  const daysToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const mondayWeek1 = new Date(jan4);
  mondayWeek1.setDate(jan4.getDate() + daysToMonday);

  // Calculate the Monday of the target week
  const targetMonday = new Date(mondayWeek1);
  targetMonday.setDate(mondayWeek1.getDate() + (weekNumber - 1) * 7);

  // Calculate the Sunday of the target week
  const targetSunday = new Date(targetMonday);
  targetSunday.setDate(targetMonday.getDate() + 6);

  return {
    start: targetMonday.toISOString().slice(0, 10),
    end: targetSunday.toISOString().slice(0, 10)
  };
}

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
        toolResult = JSON.stringify({
          status: 'duplicate',
          inserted: [],
          updated: [],
          deleted: [],
          shift_summary: 'Skiftet eksisterer allerede'
        });
      } else {
        const { data: insertedShift, error } = await supabase
          .from('user_shifts')
          .insert({
            user_id:     user_id,
            shift_date:  args.shift_date,
            start_time:  args.start_time,
            end_time:    args.end_time,
            shift_type:  0
          })
          .select('id, shift_date, start_time, end_time')
          .single();

        if (error) {
          toolResult = JSON.stringify({
            status: 'error',
            inserted: [],
            updated: [],
            deleted: [],
            shift_summary: 'Kunne ikke lagre skiftet'
          });
        } else {
          const hours = hoursBetween(args.start_time, args.end_time);
          toolResult = JSON.stringify({
            status: 'success',
            inserted: [insertedShift],
            updated: [],
            deleted: [],
            shift_summary: `Skift lagret: ${args.shift_date} ${args.start_time}-${args.end_time} (${hours} timer)`
          });
        }
      }
    }

    if (fnName === 'addSeries') {
      const dates = generateSeriesDates(args.from, args.to, args.days, args.interval_weeks, args.offset_start);
      if (!dates.length) {
        toolResult = JSON.stringify({
          status: 'error',
          inserted: [],
          updated: [],
          deleted: [],
          shift_summary: 'Ingen matchende datoer funnet'
        });
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

        if (newRows.length === 0) {
          toolResult = JSON.stringify({
            status: 'duplicate',
            inserted: [],
            updated: [],
            deleted: [],
            shift_summary: 'Alle skift eksisterer allerede'
          });
        } else {
          const { data: insertedShifts, error } = await supabase
            .from('user_shifts')
            .insert(newRows)
            .select('id, shift_date, start_time, end_time');

          if (error) {
            toolResult = JSON.stringify({
              status: 'error',
              inserted: [],
              updated: [],
              deleted: [],
              shift_summary: 'Kunne ikke lagre skiftserien'
            });
          } else {
            const totalHours = hoursBetween(args.start, args.end) * newRows.length;
            const skippedCount = rows.length - newRows.length;
            const summary = skippedCount > 0
              ? `${newRows.length} nye skift lagret (${totalHours} timer), ${skippedCount} duplikater hoppet over`
              : `${newRows.length} skift lagret (${totalHours} timer)`;

            toolResult = JSON.stringify({
              status: 'success',
              inserted: insertedShifts || [],
              updated: [],
              deleted: [],
              shift_summary: summary
            });
          }
        }
      }
    }

    if (fnName === 'editShift') {
      let shiftId = args.shift_id;

      // If no shift_id provided, try to find by date and time
      if (!shiftId && args.shift_date && args.start_time) {
        const { data: foundShift } = await supabase
          .from('user_shifts')
          .select('id')
          .eq('user_id', user_id)
          .eq('shift_date', args.shift_date)
          .eq('start_time', args.start_time)
          .maybeSingle();

        if (foundShift) {
          shiftId = foundShift.id;
        }
      }

      if (!shiftId) {
        toolResult = JSON.stringify({
          status: 'error',
          inserted: [],
          updated: [],
          deleted: [],
          shift_summary: 'Skiftet ble ikke funnet'
        });
      } else {
        // Verify shift exists and belongs to user
        const { data: existingShift } = await supabase
          .from('user_shifts')
          .select('*')
          .eq('id', shiftId)
          .eq('user_id', user_id)
          .maybeSingle();

        if (!existingShift) {
          toolResult = JSON.stringify({
            status: 'error',
            inserted: [],
            updated: [],
            deleted: [],
            shift_summary: 'Skiftet ble ikke funnet eller tilhører ikke deg'
          });
        } else {
          // Build update object
          const updateData = {};
          if (args.new_start_time) updateData.start_time = args.new_start_time;
          if (args.new_end_time) updateData.end_time = args.new_end_time;
          if (args.end_time) updateData.end_time = args.end_time; // legacy support

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
              toolResult = JSON.stringify({
                status: 'duplicate',
                inserted: [],
                updated: [],
                deleted: [],
                shift_summary: 'Et skift med samme tid eksisterer allerede'
              });
            } else {
              // Perform the update
              const { data: updatedShift, error } = await supabase
                .from('user_shifts')
                .update(updateData)
                .eq('id', shiftId)
                .eq('user_id', user_id)
                .select('id, shift_date, start_time, end_time')
                .single();

              if (error) {
                toolResult = JSON.stringify({
                  status: 'error',
                  inserted: [],
                  updated: [],
                  deleted: [],
                  shift_summary: 'Kunne ikke oppdatere skiftet'
                });
              } else {
                const hours = hoursBetween(updatedShift.start_time, updatedShift.end_time);
                toolResult = JSON.stringify({
                  status: 'success',
                  inserted: [],
                  updated: [updatedShift],
                  deleted: [],
                  shift_summary: `Skift oppdatert: ${updatedShift.shift_date} ${updatedShift.start_time}-${updatedShift.end_time} (${hours} timer)`
                });
              }
            }
          } else {
            toolResult = JSON.stringify({
              status: 'error',
              inserted: [],
              updated: [],
              deleted: [],
              shift_summary: 'Ingen endringer spesifisert'
            });
          }
        }
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
        toolResult = JSON.stringify({
          status: 'error',
          inserted: [],
          updated: [],
          deleted: [],
          shift_summary: 'Skiftet ble ikke funnet eller tilhører ikke deg'
        });
      } else {
        // Delete the shift
        const { error } = await supabase
          .from('user_shifts')
          .delete()
          .eq('id', args.shift_id)
          .eq('user_id', user_id);

        if (error) {
          toolResult = JSON.stringify({
            status: 'error',
            inserted: [],
            updated: [],
            deleted: [],
            shift_summary: 'Kunne ikke slette skiftet'
          });
        } else {
          const hours = hoursBetween(existingShift.start_time, existingShift.end_time);
          toolResult = JSON.stringify({
            status: 'success',
            inserted: [],
            updated: [],
            deleted: [existingShift],
            shift_summary: `Skift slettet: ${existingShift.shift_date} ${existingShift.start_time}-${existingShift.end_time} (${hours} timer)`
          });
        }
      }
    }

    if (fnName === 'deleteSeries') {
      let weekNumber = args.week_number;
      let year = args.year;

      // If no parameters provided, delete next week
      if (!weekNumber && !year) {
        const nextWeek = getNextWeeksDateRange(1);
        const nextWeekStart = new Date(nextWeek.start);
        weekNumber = getWeekNumber(nextWeekStart);
        year = nextWeekStart.getFullYear();
      } else if (!year) {
        year = new Date().getFullYear();
      }

      const { start, end } = getDateRangeForWeek(weekNumber, year);

      // Get shifts to be deleted for summary
      const { data: shiftsToDelete } = await supabase
        .from('user_shifts')
        .select('*')
        .eq('user_id', user_id)
        .gte('shift_date', start)
        .lte('shift_date', end);

      if (!shiftsToDelete || shiftsToDelete.length === 0) {
        toolResult = JSON.stringify({
          status: 'none',
          inserted: [],
          updated: [],
          deleted: [],
          shift_summary: `Ingen skift funnet for uke ${weekNumber}, ${year}`
        });
      } else {
        // Delete the shifts
        const { error } = await supabase
          .from('user_shifts')
          .delete()
          .eq('user_id', user_id)
          .gte('shift_date', start)
          .lte('shift_date', end);

        if (error) {
          toolResult = JSON.stringify({
            status: 'error',
            inserted: [],
            updated: [],
            deleted: [],
            shift_summary: 'Kunne ikke slette skiftene'
          });
        } else {
          const totalHours = shiftsToDelete.reduce((sum, shift) => {
            return sum + hoursBetween(shift.start_time, shift.end_time);
          }, 0);

          toolResult = JSON.stringify({
            status: 'success',
            inserted: [],
            updated: [],
            deleted: shiftsToDelete,
            shift_summary: `${shiftsToDelete.length} skift slettet for uke ${weekNumber}, ${year} (${totalHours} timer)`
          });
        }
      }
    }

    if (fnName === 'getShifts') {
      let selectQuery;
      let criteriaDescription = '';

      if (args.specific_date) {
        selectQuery = supabase
          .from('user_shifts')
          .select('*')
          .eq('user_id', user_id)
          .eq('shift_date', args.specific_date)
          .order('shift_date');
        criteriaDescription = `dato ${args.specific_date}`;
      } else if (args.date_from && args.date_to) {
        selectQuery = supabase
          .from('user_shifts')
          .select('*')
          .eq('user_id', user_id)
          .gte('shift_date', args.date_from)
          .lte('shift_date', args.date_to)
          .order('shift_date');
        criteriaDescription = `periode ${args.date_from} til ${args.date_to}`;
      } else if (args.period) {
        const today = new Date();
        const tomorrow = new Date(today);
        tomorrow.setDate(today.getDate() + 1);

        let startDate, endDate;

        switch (args.period) {
          case 'today':
            startDate = endDate = today.toISOString().slice(0, 10);
            criteriaDescription = 'i dag';
            break;
          case 'tomorrow':
            startDate = endDate = tomorrow.toISOString().slice(0, 10);
            criteriaDescription = 'i morgen';
            break;
          case 'this_week':
            const thisWeekStart = new Date(today);
            const dayOfWeek = today.getDay();
            const daysToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
            thisWeekStart.setDate(today.getDate() + daysToMonday);
            const thisWeekEnd = new Date(thisWeekStart);
            thisWeekEnd.setDate(thisWeekStart.getDate() + 6);
            startDate = thisWeekStart.toISOString().slice(0, 10);
            endDate = thisWeekEnd.toISOString().slice(0, 10);
            criteriaDescription = 'denne uken';
            break;
          case 'next_week':
            const nextWeekRange = getNextWeeksDateRange(1);
            startDate = nextWeekRange.start;
            endDate = nextWeekRange.end;
            criteriaDescription = 'neste uke';
            break;
          case 'this_month':
            const thisMonthStart = new Date(today.getFullYear(), today.getMonth(), 1);
            const thisMonthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);
            startDate = thisMonthStart.toISOString().slice(0, 10);
            endDate = thisMonthEnd.toISOString().slice(0, 10);
            criteriaDescription = 'denne måneden';
            break;
          case 'next_month':
            const nextMonthStart = new Date(today.getFullYear(), today.getMonth() + 1, 1);
            const nextMonthEnd = new Date(today.getFullYear(), today.getMonth() + 2, 0);
            startDate = nextMonthStart.toISOString().slice(0, 10);
            endDate = nextMonthEnd.toISOString().slice(0, 10);
            criteriaDescription = 'neste måned';
            break;
          default:
            toolResult = 'ERROR: Ugyldig periode spesifisert';
        }

        if (startDate && endDate) {
          selectQuery = supabase
            .from('user_shifts')
            .select('*')
            .eq('user_id', user_id)
            .gte('shift_date', startDate)
            .lte('shift_date', endDate)
            .order('shift_date');
        }
      } else {
        toolResult = 'ERROR: Ingen søkekriterier spesifisert';
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

// ---------- Main Netlify Function Export ----------
export default async (req, context) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  }

  try {
    // Parse request body
    const { messages } = await req.json();

    // Authenticate user
    const user_id = await authenticateUser(req.headers);

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
      content: `Brukerens navn er ${userName}, så du kan bruke navnet i svarene dine for å gjøre dem mer personlige. I dag er ${today}, i morgen er ${tomorrow}. Svar alltid på norsk.`
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
        const toolResult = await handleTool(call, user_id);
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
        .eq('user_id', user_id)
        .order('shift_date');

      return new Response(JSON.stringify({
        assistant: assistantMessage,
        shifts: shifts || []
      }), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      });
    } else {
      // No tool call - just return GPT's direct response
      const assistantMessage = choice.content || "Jeg forstod ikke kommandoen.";

      const { data: shifts } = await supabase
        .from('user_shifts')
        .select('*')
        .eq('user_id', user_id)
        .order('shift_date');

      return new Response(JSON.stringify({
        assistant: assistantMessage,
        shifts: shifts || []
      }), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }
  } catch (error) {
    console.error('Chat function error:', error);

    // Handle authentication errors
    if (error.message.includes('Authorization') || error.message.includes('token')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }

    // Handle other errors
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  }
};
