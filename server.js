// ===== server.js =====
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
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

// Request logging with Morgan
const logFormat = process.env.NODE_ENV === 'production' ? 'combined' : 'dev';
app.use(morgan(logFormat));

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
      end:   { type: 'string', description: 'Shift end   HH:mm' },
      interval_weeks: { type: 'integer', description: 'Interval in weeks (1=every week, 2=every other week, etc.)', default: 1 },
      offset_start: { type: 'integer', description: 'Week offset from start date (0=no offset)', default: 0 }
    },
    required: ['from', 'to', 'days', 'start', 'end']
  }
};

const editShiftSchema = {
  name: 'editShift',
  description: 'Edit an existing work shift. Can identify shift by ID, specific date/time, or natural language (e.g., "tomorrow", "Monday", "next week"). Can update date, start time, end time, or shift type.',
  parameters: {
    type: 'object',
    properties: {
      shift_id: { type: 'integer', description: 'ID of shift to edit (optional if other identifiers provided)' },
      shift_date: { type: 'string', description: 'Specific date of shift to edit YYYY-MM-DD (optional)' },
      start_time: { type: 'string', description: 'Start time of shift to edit HH:mm (optional, used with shift_date)' },
      date_reference: { type: 'string', description: 'Natural language date reference like "tomorrow", "Monday", "next Tuesday", "today" (optional)' },
      time_reference: { type: 'string', description: 'Time reference like "morning shift", "evening shift", or specific time "09:00" (optional)' },
      new_start_time: { type: 'string', description: 'New start time HH:mm (optional)' },
      new_end_time: { type: 'string', description: 'New end time HH:mm (optional)' },
      end_time: { type: 'string', description: 'New end time HH:mm (optional, legacy)' }
    },
    required: []
  }
};

const deleteShiftSchema = {
  name: 'deleteShift',
  description: 'Delete a single work shift. Can identify shift by ID, specific date/time, or natural language (e.g., "tomorrow", "Monday", "the shift at 9am today").',
  parameters: {
    type: 'object',
    properties: {
      shift_id: { type: 'integer', description: 'ID of shift to delete (optional if other identifiers provided)' },
      shift_date: { type: 'string', description: 'Specific date of shift to delete YYYY-MM-DD (optional)' },
      start_time: { type: 'string', description: 'Start time of shift to delete HH:mm (optional, used with shift_date)' },
      date_reference: { type: 'string', description: 'Natural language date reference like "tomorrow", "Monday", "next Tuesday", "today" (optional)' },
      time_reference: { type: 'string', description: 'Time reference like "morning shift", "evening shift", or specific time "09:00" (optional)' }
    },
    required: []
  }
};

const deleteSeriesSchema = {
  name: 'deleteSeries',
  description: 'Delete multiple shifts by criteria (week, date range, series) or by specific IDs. If shift_ids is provided, other criteria are ignored.',
  parameters: {
    type: 'object',
    properties: {
      shift_ids: { type: 'array', items: { type: 'integer' }, description: 'Array of specific shift IDs to delete. If provided, ignores all other criteria.' },
      criteria_type: {
        type: 'string',
        enum: ['week', 'date_range', 'series_id'],
        description: 'Type of deletion criteria. Use "week" for next week deletion. Ignored if shift_ids is provided.'
      },
      week_number: { type: 'integer', description: 'Week number (1-53) when criteria_type=week. Optional - if not provided, deletes next week.' },
      year: { type: 'integer', description: 'Year for week deletion. Optional - if not provided, deletes next week.' },
      from_date: { type: 'string', description: 'Start date YYYY-MM-DD when criteria_type=date_range' },
      to_date: { type: 'string', description: 'End date YYYY-MM-DD when criteria_type=date_range' },
      series_id: { type: 'string', description: 'Series ID when criteria_type=series_id' }
    },
    required: []
  }
};

const getShiftsSchema = {
  name: 'getShifts',
  description: 'Get existing shifts by criteria (week, date range, next weeks, or all). For "denne uka" use criteria_type=week without week_number/year.',
  parameters: {
    type: 'object',
    properties: {
      criteria_type: {
        type: 'string',
        enum: ['week', 'date_range', 'next', 'all'],
        description: 'Type of query criteria. Use "week" for current week or "next" for next week.'
      },
      week_number: { type: 'integer', description: 'Week number (1-53) when criteria_type=week. Optional - if not provided, gets current week.' },
      year: { type: 'integer', description: 'Year for week query. Optional - if not provided, gets current week.' },
      from_date: { type: 'string', description: 'Start date YYYY-MM-DD when criteria_type=date_range' },
      to_date: { type: 'string', description: 'End date YYYY-MM-DD when criteria_type=date_range' },
      num_weeks: { type: 'integer', description: 'Number of weeks to get when criteria_type=next (default 1)' }
    },
    required: ['criteria_type']
  }
};

const copyShiftSchema = {
  name: 'copyShift',
  description: 'Find a shift by natural language reference and copy it to future dates. Combines finding and copying in one operation.',
  parameters: {
    type: 'object',
    properties: {
      source_date_reference: { type: 'string', description: 'Natural language reference to source shift date like "Monday", "last Tuesday", "yesterday"' },
      source_time_reference: { type: 'string', description: 'Time reference for source shift like "morning", "evening", or specific time "09:00" (optional)' },
      target_dates: { type: 'array', items: { type: 'string' }, description: 'Array of target dates in YYYY-MM-DD format to copy the shift to' },
      target_date_references: { type: 'array', items: { type: 'string' }, description: 'Array of natural language date references like ["next Monday", "next Tuesday"] (alternative to target_dates)' },
      weeks_ahead: { type: 'integer', description: 'Number of weeks ahead to copy the shift (alternative to target_dates/target_date_references)' }
    },
    required: ['source_date_reference']
  }
};

const getWageDataByWeekSchema = {
  name: 'getWageDataByWeek',
  description: 'Get detailed wage data for a specific week including shift duration, earnings breakdown, and totals.',
  parameters: {
    type: 'object',
    properties: {
      week_number: { type: 'integer', description: 'Week number (1-53). Optional - if not provided, gets current week.' },
      year: { type: 'integer', description: 'Year for week query. Optional - if not provided, gets current week.' }
    },
    required: []
  }
};

const getWageDataByMonthSchema = {
  name: 'getWageDataByMonth',
  description: 'Get detailed wage data for a specific month including shift duration, earnings breakdown, and totals.',
  parameters: {
    type: 'object',
    properties: {
      month: { type: 'integer', description: 'Month number (1-12). Optional - if not provided, uses current viewing month.' },
      year: { type: 'integer', description: 'Year. Optional - if not provided, uses current viewing year.' }
    },
    required: []
  }
};

const getWageDataByDateRangeSchema = {
  name: 'getWageDataByDateRange',
  description: 'Get detailed wage data for a custom date range including shift duration, earnings breakdown, and totals.',
  parameters: {
    type: 'object',
    properties: {
      from_date: { type: 'string', description: 'Start date YYYY-MM-DD' },
      to_date: { type: 'string', description: 'End date YYYY-MM-DD' }
    },
    required: ['from_date', 'to_date']
  }
};

const tools = [
  { type: 'function', function: addShiftSchema },
  { type: 'function', function: addSeriesSchema },
  { type: 'function', function: editShiftSchema },
  { type: 'function', function: deleteShiftSchema },
  { type: 'function', function: deleteSeriesSchema },
  { type: 'function', function: getShiftsSchema },
  { type: 'function', function: copyShiftSchema },
  { type: 'function', function: getWageDataByWeekSchema },
  { type: 'function', function: getWageDataByMonthSchema },
  { type: 'function', function: getWageDataByDateRangeSchema }
];

// ---------- helpers ----------

// Wage calculation constants and helpers
const PAUSE_THRESHOLD = 5.5;
const PAUSE_DEDUCTION = 0.5;
const PRESET_WAGE_RATES = {
  '-1': 129.91,  // under16
  '-2': 132.90,  // under18
  1: 184.54,
  2: 185.38,
  3: 187.46,
  4: 193.05,
  5: 210.81,
  6: 256.14
};
const PRESET_BONUSES = {
  weekday: [
    { from: '18:00', to: '06:00', rate: 15.5 }
  ],
  saturday: [
    { from: '00:00', to: '24:00', rate: 15.5 }
  ],
  sunday: [
    { from: '00:00', to: '24:00', rate: 31.0 }
  ]
};

function timeToMinutes(timeStr) {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
}

function calculateOverlap(start1, end1, start2, end2) {
  const overlapStart = Math.max(start1, start2);
  const overlapEnd = Math.min(end1, end2);
  return Math.max(0, overlapEnd - overlapStart);
}

function calculateBonus(startTime, endTime, bonusSegments) {
  let totalBonus = 0;
  const startMinutes = timeToMinutes(startTime);
  let endMinutes = timeToMinutes(endTime);

  // Handle shifts that continue past midnight
  if (endMinutes <= startMinutes) {
    endMinutes += 24 * 60;
  }

  for (const segment of bonusSegments) {
    const segStart = timeToMinutes(segment.from);
    let segEnd = timeToMinutes(segment.to);
    if (segEnd <= segStart) {
      segEnd += 24 * 60;
    }
    const overlap = calculateOverlap(startMinutes, endMinutes, segStart, segEnd);
    totalBonus += (overlap / 60) * segment.rate;
  }
  return totalBonus;
}

async function getUserSettings(user_id) {
  const { data: settings, error } = await supabase
    .from('user_settings')
    .select('*')
    .eq('user_id', user_id)
    .single();

  if (error && error.code !== 'PGRST116') {
    console.error('Error fetching user settings:', error);
    return null;
  }

  return settings;
}

// Date resolution functions for temporal references
function resolveDateReference(reference, viewingMonth, viewingYear) {
  const today = new Date();
  const currentMonth = today.getMonth() + 1;
  const currentYear = today.getFullYear();

  // Normalize reference to lowercase
  const ref = reference.toLowerCase().trim();

  // Handle month references
  if (ref.includes('denne måneden') || ref.includes('inneværende måned') || ref === 'denne måned') {
    const firstDay = new Date(viewingYear, viewingMonth - 1, 1).toISOString().slice(0, 10);
    const lastDay = new Date(viewingYear, viewingMonth, 0).toISOString().slice(0, 10);
    return { from_date: firstDay, to_date: lastDay, description: `${getMonthName(viewingMonth)} ${viewingYear}` };
  }

  if (ref.includes('forrige måned') || ref.includes('sist måned')) {
    let prevMonth = viewingMonth - 1;
    let prevYear = viewingYear;
    if (prevMonth < 1) {
      prevMonth = 12;
      prevYear = viewingYear - 1;
    }
    const firstDay = new Date(prevYear, prevMonth - 1, 1).toISOString().slice(0, 10);
    const lastDay = new Date(prevYear, prevMonth, 0).toISOString().slice(0, 10);
    return { from_date: firstDay, to_date: lastDay, description: `${getMonthName(prevMonth)} ${prevYear}` };
  }

  if (ref.includes('neste måned')) {
    let nextMonth = viewingMonth + 1;
    let nextYear = viewingYear;
    if (nextMonth > 12) {
      nextMonth = 1;
      nextYear = viewingYear + 1;
    }
    const firstDay = new Date(nextYear, nextMonth - 1, 1).toISOString().slice(0, 10);
    const lastDay = new Date(nextYear, nextMonth, 0).toISOString().slice(0, 10);
    return { from_date: firstDay, to_date: lastDay, description: `${getMonthName(nextMonth)} ${nextYear}` };
  }

  // Handle week references
  if (ref.includes('denne uka') || ref.includes('denne uken') || ref === 'denne uke') {
    const { start, end } = getCurrentWeekDateRange();
    return { from_date: start, to_date: end, description: 'denne uka' };
  }

  if (ref.includes('forrige uke') || ref.includes('sist uke')) {
    const { start, end } = getPreviousWeekDateRange();
    return { from_date: start, to_date: end, description: 'forrige uke' };
  }

  if (ref.includes('neste uke')) {
    const { start, end } = getNextWeeksDateRange(1);
    return { from_date: start, to_date: end, description: 'neste uke' };
  }

  // Handle quarter references
  if (ref.includes('dette kvartalet') || ref.includes('inneværende kvartal')) {
    const quarter = Math.ceil(viewingMonth / 3);
    const firstMonth = (quarter - 1) * 3 + 1;
    const lastMonth = quarter * 3;
    const firstDay = new Date(viewingYear, firstMonth - 1, 1).toISOString().slice(0, 10);
    const lastDay = new Date(viewingYear, lastMonth, 0).toISOString().slice(0, 10);
    return { from_date: firstDay, to_date: lastDay, description: `Q${quarter} ${viewingYear}` };
  }

  // Handle year references
  if (ref.includes('i år') || ref.includes('dette året')) {
    const firstDay = new Date(viewingYear, 0, 1).toISOString().slice(0, 10);
    const lastDay = new Date(viewingYear, 11, 31).toISOString().slice(0, 10);
    return { from_date: firstDay, to_date: lastDay, description: `${viewingYear}` };
  }

  if (ref.includes('i fjor') || ref.includes('forrige år')) {
    const prevYear = viewingYear - 1;
    const firstDay = new Date(prevYear, 0, 1).toISOString().slice(0, 10);
    const lastDay = new Date(prevYear, 11, 31).toISOString().slice(0, 10);
    return { from_date: firstDay, to_date: lastDay, description: `${prevYear}` };
  }

  // Return null if no pattern matches
  return null;
}

function getMonthName(monthNumber) {
  const monthNames = ['januar', 'februar', 'mars', 'april', 'mai', 'juni', 'juli', 'august', 'september', 'oktober', 'november', 'desember'];
  return monthNames[monthNumber - 1];
}

function getPreviousWeekDateRange() {
  const today = new Date();
  const currentDay = today.getDay();
  const mondayOffset = currentDay === 0 ? 6 : currentDay - 1; // Sunday = 0, so 6 days back to Monday

  // Get last week's Monday
  const lastWeekMonday = new Date(today);
  lastWeekMonday.setDate(today.getDate() - mondayOffset - 7);

  // Get last week's Sunday
  const lastWeekSunday = new Date(lastWeekMonday);
  lastWeekSunday.setDate(lastWeekMonday.getDate() + 6);

  return {
    start: lastWeekMonday.toISOString().slice(0, 10),
    end: lastWeekSunday.toISOString().slice(0, 10)
  };
}

function calculateShiftEarnings(shift, userSettings) {
  const startMinutes = timeToMinutes(shift.start_time);
  let endMinutes = timeToMinutes(shift.end_time);

  // Handle shifts that cross midnight
  if (endMinutes < startMinutes) {
    endMinutes += 24 * 60;
  } else if (endMinutes === startMinutes) {
    // Assume 24-hour shift if times are identical
    endMinutes += 24 * 60;
  }

  const durationHours = (endMinutes - startMinutes) / 60;

  if (durationHours <= 0) {
    return {
      hours: 0,
      totalHours: 0,
      paidHours: 0,
      pauseDeducted: false,
      baseWage: 0,
      bonus: 0,
      total: 0
    };
  }

  let paidHours = durationHours;
  let adjustedEndMinutes = endMinutes;

  // Apply pause deduction if enabled
  const pauseDeduction = userSettings?.pause_deduction !== false;
  if (pauseDeduction && durationHours > PAUSE_THRESHOLD) {
    paidHours -= PAUSE_DEDUCTION;
    adjustedEndMinutes -= PAUSE_DEDUCTION * 60;
  }

  // Get wage rate
  const usePreset = userSettings?.use_preset !== false;
  const wageRate = usePreset
    ? PRESET_WAGE_RATES[userSettings?.wage_level || userSettings?.current_wage_level || 1]
    : (userSettings?.custom_wage || 200);

  const baseWage = paidHours * wageRate;

  // Get bonuses
  const bonuses = usePreset ? PRESET_BONUSES : (userSettings?.custom_bonuses || {
    weekday: [],
    saturday: [],
    sunday: []
  });

  const bonusType = shift.shift_type === 0 ? 'weekday' : (shift.shift_type === 1 ? 'saturday' : 'sunday');
  const bonusSegments = bonuses[bonusType] || [];

  // Calculate end time after adjustments
  const endHour = Math.floor(adjustedEndMinutes / 60) % 24;
  const endTimeStr = `${String(endHour).padStart(2,'0')}:${(adjustedEndMinutes % 60).toString().padStart(2,'0')}`;

  const bonus = calculateBonus(shift.start_time, endTimeStr, bonusSegments);

  return {
    hours: parseFloat(paidHours.toFixed(2)),
    totalHours: parseFloat(durationHours.toFixed(2)),
    paidHours: parseFloat(paidHours.toFixed(2)),
    pauseDeducted: pauseDeduction && durationHours > PAUSE_THRESHOLD,
    baseWage: parseFloat(baseWage.toFixed(2)),
    bonus: parseFloat(bonus.toFixed(2)),
    total: parseFloat((baseWage + bonus).toFixed(2))
  };
}

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

function getCurrentWeekDateRange() {
  const today = new Date();
  const currentDay = today.getDay();

  // Find start of current week (Monday)
  const startOfCurrentWeek = new Date(today);
  const daysToMonday = currentDay === 0 ? -6 : 1 - currentDay;
  startOfCurrentWeek.setDate(today.getDate() + daysToMonday);

  // End of current week (Sunday)
  const endOfCurrentWeek = new Date(startOfCurrentWeek);
  endOfCurrentWeek.setDate(startOfCurrentWeek.getDate() + 6);

  return {
    start: startOfCurrentWeek.toISOString().slice(0, 10),
    end: endOfCurrentWeek.toISOString().slice(0, 10)
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

// Parse natural language date references
function parseNaturalDate(dateReference) {
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);

  const dayNames = ['søndag', 'mandag', 'tirsdag', 'onsdag', 'torsdag', 'fredag', 'lørdag'];
  const dayNamesEn = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

  const ref = dateReference.toLowerCase().trim();

  // Handle specific cases
  if (ref === 'today' || ref === 'i dag' || ref === 'idag') {
    return today.toISOString().slice(0, 10);
  }

  if (ref === 'tomorrow' || ref === 'i morgen' || ref === 'imorgen') {
    return tomorrow.toISOString().slice(0, 10);
  }

  // Handle weekday names (Norwegian and English)
  const allDayNames = [...dayNames, ...dayNamesEn];
  for (let i = 0; i < allDayNames.length; i++) {
    const dayName = allDayNames[i];
    if (ref === dayName || ref === `neste ${dayName}` || ref === `next ${dayName}`) {
      const targetDay = i % 7; // Get day index (0 = Sunday, 1 = Monday, etc.)
      const currentDay = today.getDay();

      let daysToAdd;
      if (ref.includes('neste') || ref.includes('next')) {
        // Next occurrence of this weekday (at least 7 days from now)
        daysToAdd = 7 + ((targetDay - currentDay + 7) % 7);
      } else {
        // Next occurrence of this weekday (could be today if it matches)
        daysToAdd = (targetDay - currentDay + 7) % 7;
        if (daysToAdd === 0 && targetDay !== currentDay) {
          daysToAdd = 7; // If it's the same day, go to next week
        }
      }

      const targetDate = new Date(today);
      targetDate.setDate(today.getDate() + daysToAdd);
      return targetDate.toISOString().slice(0, 10);
    }
  }

  // If no match found, return null
  return null;
}

// Find shifts by natural language reference
async function findShiftsByReference(user_id, dateReference, timeReference) {
  let targetDate = null;

  // Parse date reference
  if (dateReference) {
    targetDate = parseNaturalDate(dateReference);
  }

  if (!targetDate) {
    return { shifts: [], error: 'Kunne ikke forstå datoen' };
  }

  // Get shifts for the target date
  const { data: shifts, error } = await supabase
    .from('user_shifts')
    .select('*')
    .eq('user_id', user_id)
    .eq('shift_date', targetDate)
    .order('start_time');

  if (error) {
    return { shifts: [], error: 'Kunne ikke hente skift' };
  }

  if (!shifts || shifts.length === 0) {
    return { shifts: [], error: `Ingen skift funnet for ${targetDate}` };
  }

  // Filter by time reference if provided
  if (timeReference) {
    const timeRef = timeReference.toLowerCase().trim();
    let filteredShifts = shifts;

    if (timeRef.includes('morgen') || timeRef.includes('morning')) {
      // Morning shifts (before 12:00)
      filteredShifts = shifts.filter(shift => {
        const startHour = parseInt(shift.start_time.split(':')[0]);
        return startHour < 12;
      });
    } else if (timeRef.includes('kveld') || timeRef.includes('evening') || timeRef.includes('night')) {
      // Evening/night shifts (after 16:00)
      filteredShifts = shifts.filter(shift => {
        const startHour = parseInt(shift.start_time.split(':')[0]);
        return startHour >= 16;
      });
    } else if (timeRef.match(/^\d{1,2}:?\d{0,2}$/)) {
      // Specific time reference
      const normalizedTime = timeRef.includes(':') ? timeRef : `${timeRef}:00`;
      filteredShifts = shifts.filter(shift => shift.start_time === normalizedTime);
    }

    if (filteredShifts.length === 0) {
      return { shifts: [], error: `Ingen skift funnet for ${targetDate} med tidspunkt ${timeReference}` };
    }

    return { shifts: filteredShifts, error: null };
  }

  return { shifts, error: null };
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
  const { messages, stream = false, currentMonth, currentYear } = req.body;

  // Get user message first for system prompt customization
  const userMessage = messages[messages.length - 1]?.content?.toLowerCase() || '';

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

  // Get current viewing context from frontend (defaults to current month/year if not provided)
  const viewingMonth = currentMonth || new Date().getMonth() + 1;
  const viewingYear = currentYear || new Date().getFullYear();
  const monthNames = ['januar', 'februar', 'mars', 'april', 'mai', 'juni', 'juli', 'august', 'september', 'oktober', 'november', 'desember'];
  const viewingMonthName = monthNames[viewingMonth - 1];

  // Create a more specific system prompt based on the user message
  let systemContent = `For konteksten: "i dag" = ${today}, "i morgen" = ${tomorrow}. Brukerens navn er ${userName}.

VIKTIG KONTEKST: Brukeren ser på ${viewingMonthName} ${viewingYear} i grensesnittet.
Når brukeren sier "denne måneden" eller "inneværende måned", mener de ${viewingMonthName} ${viewingYear}.
Når brukeren sier "forrige måned", mener de måneden før ${viewingMonthName} ${viewingYear}.
Når brukeren sier "neste måned", mener de måneden etter ${viewingMonthName} ${viewingYear}.

ABSOLUTT KRITISK - MULTIPLE TOOL CALLS REGEL:
Når brukeren ber om flere operasjoner i SAMME melding, MÅ du utføre ALLE operasjonene i SAMME respons med flere tool_calls. Dette er OBLIGATORISK, ikke valgfritt!`;

  // Add specific instructions for common patterns
  if (userMessage.includes('vis') && userMessage.includes('endre')) {
    systemContent += `

SPESIFIKK INSTRUKSJON for din forespørsel:
Du skal gjøre NØYAKTIG disse to tool calls i denne rekkefølgen:
1. getShifts({"criteria_type": "week"}) - for å hente vaktene
2. editShift({"date_reference": "Friday", "new_start_time": "15:00"}) - for å endre fredagsvakten

IKKE gjør getShifts to ganger! IKKE spør om bekreftelse! Gjør begge operasjonene nå!`;
  } else if (userMessage.includes('måneden') || userMessage.includes('august') || userMessage.includes('måned')) {
    // Use the viewing context month instead of current month
    const firstDay = new Date(viewingYear, viewingMonth - 1, 1).toISOString().slice(0, 10);
    const lastDay = new Date(viewingYear, viewingMonth, 0).toISOString().slice(0, 10);

    systemContent += `

SPESIFIKK INSTRUKSJON for månedlig spørring:
Bruk getWageDataByMonth() for å hente detaljerte lønnsdata for ${viewingMonthName} ${viewingYear}, eller
getShifts({"criteria_type": "date_range", "from_date": "${firstDay}", "to_date": "${lastDay}"}) for enklere vaktliste.
Du KAN absolutt hente vakter for hele måneder - ikke si at det ikke er mulig!

TILGJENGELIGE FUNKSJONER for lønnsdata:
- getWageDataByWeek() - detaljerte lønnsdata for en uke
- getWageDataByMonth() - detaljerte lønnsdata for en måned
- getWageDataByDateRange(from_date, to_date) - detaljerte lønnsdata for egendefinert periode
- getShifts() - enklere vaktliste uten lønnsberegninger`;
  }

  const systemContextHint = {
    role: 'system',
    content: `Du er en vaktplanleggingsassistent. I dag er ${today}, i morgen er ${tomorrow}. Brukerens navn er ${userName}.

VIKTIG KONTEKST: Brukeren ser på ${viewingMonthName} ${viewingYear} i grensesnittet.
- "denne måneden"/"inneværende måned" = ${viewingMonthName} ${viewingYear}
- "forrige måned" = måneden før ${viewingMonthName} ${viewingYear}
- "neste måned" = måneden etter ${viewingMonthName} ${viewingYear}

LØNNSDATA FUNKSJONER:
- getWageDataByWeek() - detaljerte lønnsdata for uke (timer, grunnlønn, tillegg, totalt)
- getWageDataByMonth() - detaljerte lønnsdata for måned (bruker viewing context hvis ikke spesifisert)
- getWageDataByDateRange(from_date, to_date) - detaljerte lønnsdata for periode
- getShifts() - enklere vaktliste med grunnleggende lønnsinfo

${systemContent}

TOOL USAGE:
- getShifts:
  * criteria_type="week" for denne uka
  * criteria_type="next" for neste uke
  * criteria_type="date_range" med from_date og to_date for måneder/perioder (f.eks. "denne måneden", "august", "siste 30 dager")
  * criteria_type="all" for alle vakter
- editShift: bruk date_reference="Friday" for fredagsvakter, eller shift_date + start_time
- Vis datoer som dd.mm.yyyy til brukeren

MÅNEDLIGE SPØRRINGER: For "denne måneden", "august", "hvor mange vakter har jeg denne måneden" osv., bruk getShifts med criteria_type="date_range" og sett from_date til første dag i måneden og to_date til siste dag.

FORMATERING: IKKE bruk bullet points (•) eller nummererte lister (1., 2., 3.). I stedet, bruk linjeskift og fet tekst for å lage lister. Eksempel:
**04.08.2025** fra kl. 17:00 til 23:15
**05.08.2025** fra kl. 16:00 til 23:15
**08.08.2025** fra kl. 16:00 til 23:15

ALDRI gjør samme tool call to ganger med samme parametere! Bruk FORSKJELLIGE tools for FORSKJELLIGE operasjoner!`
  };
  const fullMessages = [systemContextHint, ...messages];

  // Set up streaming if requested
  if (stream) {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('Access-Control-Allow-Origin', '*');

    // Send initial status
    res.write(`data: ${JSON.stringify({ type: 'status', message: 'Starter GPT-forespørsel...' })}\n\n`);
  }

  // First call: Let GPT choose tools - force tool usage for multi-step operations
  const isMultiStep = /\bog\b.*\bog\b|vis.*og.*endre|vis.*og.*slett|vis.*og.*gjør|legg til.*og.*legg til|hent.*og.*endre/.test(userMessage);



  const completion = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: fullMessages,
    tools,
    tool_choice: isMultiStep ? 'required' : 'auto'
  });

  const choice = completion.choices[0].message;

  // Log what GPT decided to do
  console.log('=== GPT RESPONSE ===');
  console.log('Content:', choice.content);
  console.log('Tool calls:', choice.tool_calls?.length || 0);
  if (choice.tool_calls) {
    choice.tool_calls.forEach((call, i) => {
      console.log(`Tool ${i+1}: ${call.function.name}(${call.function.arguments})`);
    });
  }
  console.log('==================');

  if (stream) {
    res.write(`data: ${JSON.stringify({
      type: 'gpt_response',
      content: choice.content,
      tool_calls: choice.tool_calls?.map(call => ({
        name: call.function.name,
        arguments: call.function.arguments
      })) || []
    })}\n\n`);
  }

  if (choice.tool_calls && choice.tool_calls.length > 0) {
    // Handle multiple tool calls
    const toolMessages = [];

    if (stream) {
      res.write(`data: ${JSON.stringify({
        type: 'tool_calls_start',
        count: choice.tool_calls.length,
        message: `Utfører ${choice.tool_calls.length} operasjon${choice.tool_calls.length > 1 ? 'er' : ''}...`
      })}\n\n`);
    }

    for (const call of choice.tool_calls) {
      if (stream) {
        res.write(`data: ${JSON.stringify({
          type: 'tool_call_start',
          name: call.function.name,
          arguments: JSON.parse(call.function.arguments),
          message: `Utfører ${call.function.name}...`
        })}\n\n`);
      }

      const toolResult = await handleTool(call, req.user_id);

      if (stream) {
        res.write(`data: ${JSON.stringify({
          type: 'tool_call_complete',
          name: call.function.name,
          result: toolResult.substring(0, 200) + (toolResult.length > 200 ? '...' : ''),
          message: `${call.function.name} fullført`
        })}\n\n`);
      }

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
    // Skip the "generating_response" status message - go directly to streaming

    let assistantMessage = '';
    try {
      if (stream) {
        // Use streaming for the final response
        const streamCompletion = await openai.chat.completions.create({
          model: 'gpt-4.1',
          messages: messagesWithToolResult,
          tools,
          tool_choice: 'none',
          stream: true
        });

        // Send start of text streaming
        res.write(`data: ${JSON.stringify({
          type: 'text_stream_start'
        })}\n\n`);

        for await (const chunk of streamCompletion) {
          const content = chunk.choices[0]?.delta?.content;
          if (content) {
            assistantMessage += content;
            // Send each chunk of text
            res.write(`data: ${JSON.stringify({
              type: 'text_chunk',
              content: content
            })}\n\n`);
          }
        }

        // Send end of text streaming
        res.write(`data: ${JSON.stringify({
          type: 'text_stream_end'
        })}\n\n`);

        // Get updated shift list for streaming
        const { data: shifts } = await supabase
          .from('user_shifts')
          .select('*')
          .eq('user_id', req.user_id)
          .order('shift_date');

        // Send shifts update
        res.write(`data: ${JSON.stringify({
          type: 'shifts_update',
          shifts: shifts || []
        })}\n\n`);
      } else {
        // Non-streaming version
        const secondCompletion = await openai.chat.completions.create({
          model: 'gpt-4o',
          messages: messagesWithToolResult,
          tools,
          tool_choice: 'none'
        });
        assistantMessage = secondCompletion.choices[0].message.content;
      }
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

    if (stream) {
      res.write(`data: ${JSON.stringify({
        type: 'complete',
        assistant: assistantMessage,
        shifts: shifts || []
      })}\n\n`);
      res.write('data: [DONE]\n\n');
      res.end();
    } else {
      res.json({
        assistant: assistantMessage,
        shifts: shifts || []
      });
    }
  } else {
    // No tool call - just return GPT's direct response
    const assistantMessage = choice.content || "Jeg forstod ikke kommandoen.";

    const { data: shifts } = await supabase
      .from('user_shifts')
      .select('*')
      .eq('user_id', req.user_id)
      .order('shift_date');

    if (stream) {
      res.write(`data: ${JSON.stringify({
        type: 'complete',
        assistant: assistantMessage,
        shifts: shifts || []
      })}\n\n`);
      res.write('data: [DONE]\n\n');
      res.end();
    } else {
      res.json({
        assistant: assistantMessage,
        shifts: shifts || []
      });
    }
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
            status: 'ok',
            inserted: [insertedShift],
            updated: [],
            deleted: [],
            shift_summary: `1 skift lagret (${hours} timer)`
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

        if (newRows.length > 0) {
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
              shift_summary: 'Kunne ikke lagre serien'
            });
          } else {
            const totalHours = hoursBetween(args.start, args.end) * newRows.length;
            const duplicates = rows.length - newRows.length;

            let summary;
            if (duplicates > 0) {
              summary = `${newRows.length} nye skift lagret (${totalHours} timer), ${duplicates} eksisterte fra før`;
            } else {
              summary = `${newRows.length} skift lagret (${totalHours} timer)`;
            }

            toolResult = JSON.stringify({
              status: 'ok',
              inserted: insertedShifts || [],
              updated: [],
              deleted: [],
              shift_summary: summary
            });
          }
        } else {
          toolResult = JSON.stringify({
            status: 'duplicate',
            inserted: [],
            updated: [],
            deleted: [],
            shift_summary: `Alle ${rows.length} skift eksisterte fra før`
          });
        }
      }
    }

    if (fnName === 'editShift') {
      let existingShift = null;
      let shiftId = args.shift_id;

      // Find shift by ID, specific date+time, or natural language reference
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
        // Find by specific date+time
        const { data } = await supabase
          .from('user_shifts')
          .select('*')
          .eq('user_id', user_id)
          .eq('shift_date', args.shift_date)
          .eq('start_time', args.start_time);

        if (!data || data.length === 0) {
          toolResult = JSON.stringify({
            status: 'error',
            inserted: [],
            updated: [],
            deleted: [],
            shift_summary: 'Fant ikke skiftet for den datoen og tiden'
          });
        } else if (data.length > 1) {
          toolResult = JSON.stringify({
            status: 'error',
            inserted: [],
            updated: [],
            deleted: [],
            shift_summary: 'Flere skift funnet for samme dato og tid. Vennligst presiser hvilken du vil redigere'
          });
        } else {
          existingShift = data[0];
          shiftId = existingShift.id;
        }
      } else if (args.date_reference) {
        // Find by natural language reference
        const { shifts, error } = await findShiftsByReference(user_id, args.date_reference, args.time_reference);

        if (error) {
          toolResult = JSON.stringify({
            status: 'error',
            inserted: [],
            updated: [],
            deleted: [],
            shift_summary: error
          });
        } else if (shifts.length === 0) {
          toolResult = JSON.stringify({
            status: 'error',
            inserted: [],
            updated: [],
            deleted: [],
            shift_summary: 'Ingen skift funnet for den referansen'
          });
        } else if (shifts.length > 1) {
          const shiftList = shifts.map(s => `${s.start_time}-${s.end_time}`).join(', ');
          toolResult = JSON.stringify({
            status: 'error',
            inserted: [],
            updated: [],
            deleted: [],
            shift_summary: `Flere skift funnet (${shiftList}). Vennligst presiser hvilken du vil redigere`
          });
        } else {
          existingShift = shifts[0];
          shiftId = existingShift.id;
        }
      } else {
        toolResult = JSON.stringify({
          status: 'error',
          inserted: [],
          updated: [],
          deleted: [],
          shift_summary: 'Du må oppgi enten shift_id, shift_date+start_time, eller date_reference'
        });
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
            toolResult = JSON.stringify({
              status: 'error',
              inserted: [],
              updated: [],
              deleted: [],
              shift_summary: 'Et skift med samme tid eksisterer allerede'
            });
          } else {
            // Perform update
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
              const finalStart = updateData.start_time || existingShift.start_time;
              const finalEnd = updateData.end_time || existingShift.end_time;
              const hours = hoursBetween(finalStart, finalEnd);
              toolResult = JSON.stringify({
                status: 'ok',
                inserted: [],
                updated: [updatedShift],
                deleted: [],
                shift_summary: `1 skift oppdatert (${hours} timer)`
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
      } else if (!toolResult.includes('"status"')) {
        toolResult = JSON.stringify({
          status: 'error',
          inserted: [],
          updated: [],
          deleted: [],
          shift_summary: 'Skiftet ble ikke funnet eller tilhører ikke deg'
        });
      }
    }

    if (fnName === 'deleteShift') {
      let existingShift = null;
      let shiftId = args.shift_id;

      // Find shift by ID, specific date+time, or natural language reference
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
        // Find by specific date+time
        const { data } = await supabase
          .from('user_shifts')
          .select('*')
          .eq('user_id', user_id)
          .eq('shift_date', args.shift_date)
          .eq('start_time', args.start_time)
          .maybeSingle();
        existingShift = data;
        if (existingShift) {
          shiftId = existingShift.id;
        }
      } else if (args.date_reference) {
        // Find by natural language reference
        const { shifts, error } = await findShiftsByReference(user_id, args.date_reference, args.time_reference);

        if (error) {
          toolResult = JSON.stringify({
            status: 'error',
            inserted: [],
            updated: [],
            deleted: [],
            shift_summary: error
          });
        } else if (shifts.length === 0) {
          toolResult = JSON.stringify({
            status: 'error',
            inserted: [],
            updated: [],
            deleted: [],
            shift_summary: 'Ingen skift funnet for den referansen'
          });
        } else if (shifts.length > 1) {
          const shiftList = shifts.map(s => `${s.start_time}-${s.end_time}`).join(', ');
          toolResult = JSON.stringify({
            status: 'error',
            inserted: [],
            updated: [],
            deleted: [],
            shift_summary: `Flere skift funnet (${shiftList}). Vennligst presiser hvilken du vil slette`
          });
        } else {
          existingShift = shifts[0];
          shiftId = existingShift.id;
        }
      } else {
        toolResult = JSON.stringify({
          status: 'error',
          inserted: [],
          updated: [],
          deleted: [],
          shift_summary: 'Du må oppgi enten shift_id, shift_date+start_time, eller date_reference'
        });
      }

      // Proceed with deletion if shift was found
      if (existingShift && !toolResult) {
        const { error } = await supabase
          .from('user_shifts')
          .delete()
          .eq('id', shiftId)
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
            status: 'ok',
            inserted: [],
            updated: [],
            deleted: [{ id: existingShift.id, shift_date: existingShift.shift_date, start_time: existingShift.start_time, end_time: existingShift.end_time }],
            shift_summary: `1 skift slettet (${hours} timer)`
          });
        }
      } else if (!existingShift && !toolResult) {
        toolResult = JSON.stringify({
          status: 'error',
          inserted: [],
          updated: [],
          deleted: [],
          shift_summary: 'Skiftet ble ikke funnet eller tilhører ikke deg'
        });
      }
    }

    if (fnName === 'deleteSeries') {
      // Handle shift_ids first - if provided, ignore other criteria
      if (args.shift_ids && Array.isArray(args.shift_ids) && args.shift_ids.length > 0) {
        // Get shifts to be deleted for summary
        const { data: shiftsToDelete, error: fetchError } = await supabase
          .from('user_shifts')
          .select('id, shift_date, start_time, end_time')
          .eq('user_id', user_id)
          .in('id', args.shift_ids);

        if (fetchError) {
          toolResult = JSON.stringify({
            status: 'error',
            inserted: [],
            updated: [],
            deleted: [],
            shift_summary: 'Kunne ikke hente skift for sletting'
          });
        } else if (!shiftsToDelete || shiftsToDelete.length === 0) {
          toolResult = JSON.stringify({
            status: 'error',
            inserted: [],
            updated: [],
            deleted: [],
            shift_summary: 'Ingen av de spesifiserte skiftene ble funnet'
          });
        } else {
          // Delete the shifts
          const { error: deleteError } = await supabase
            .from('user_shifts')
            .delete()
            .eq('user_id', user_id)
            .in('id', args.shift_ids);

          if (deleteError) {
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
              status: 'ok',
              inserted: [],
              updated: [],
              deleted: shiftsToDelete,
              shift_summary: `${shiftsToDelete.length} skift slettet (${totalHours} timer)`
            });
          }
        }
      } else {
        // Original criteria-based deletion logic
        let deleteQuery = supabase
          .from('user_shifts')
          .delete()
          .eq('user_id', user_id);

        let criteriaDescription = '';

        if (args.criteria_type === 'week') {
        if (!args.week_number || !args.year) {
          // If no week_number/year specified, delete next week
          const { start, end } = getNextWeeksDateRange(1);
          deleteQuery = deleteQuery.gte('shift_date', start).lte('shift_date', end);
          criteriaDescription = 'neste uke';
        } else {
          const { start, end } = getWeekDateRange(args.week_number, args.year);
          deleteQuery = deleteQuery.gte('shift_date', start).lte('shift_date', end);
          criteriaDescription = `uke ${args.week_number} i ${args.year}`;
        }
      } else if (args.criteria_type === 'date_range') {
          if (!args.from_date || !args.to_date) {
            toolResult = JSON.stringify({
              status: 'error',
              inserted: [],
              updated: [],
              deleted: [],
              shift_summary: 'Fra-dato og til-dato må spesifiseres for periode-sletting'
            });
          } else {
            deleteQuery = deleteQuery.gte('shift_date', args.from_date).lte('shift_date', args.to_date);
            criteriaDescription = `periode ${args.from_date} til ${args.to_date}`;
          }
        } else if (args.criteria_type === 'series_id') {
          if (!args.series_id) {
            toolResult = JSON.stringify({
              status: 'error',
              inserted: [],
              updated: [],
              deleted: [],
              shift_summary: 'Serie-ID må spesifiseres for serie-sletting'
            });
          } else {
            deleteQuery = deleteQuery.eq('series_id', args.series_id);
            criteriaDescription = `serie ${args.series_id}`;
          }
        } else {
          toolResult = JSON.stringify({
            status: 'error',
            inserted: [],
            updated: [],
            deleted: [],
            shift_summary: 'Ugyldig slette-kriterium'
          });
        }

        // Only proceed if no error so far
        if (!toolResult.includes('"status"')) {
          // First, get shifts to be deleted for summary
          let selectQuery = supabase
            .from('user_shifts')
            .select('id, shift_date, start_time, end_time')
            .eq('user_id', user_id);

          if (args.criteria_type === 'week') {
            if (!args.week_number || !args.year) {
              // If no week_number/year specified, delete next week
              const { start, end } = getNextWeeksDateRange(1);
              selectQuery = selectQuery.gte('shift_date', start).lte('shift_date', end);
            } else {
              const { start, end } = getWeekDateRange(args.week_number, args.year);
              selectQuery = selectQuery.gte('shift_date', start).lte('shift_date', end);
            }
          } else if (args.criteria_type === 'date_range') {
            selectQuery = selectQuery.gte('shift_date', args.from_date).lte('shift_date', args.to_date);
          } else if (args.criteria_type === 'series_id') {
            selectQuery = selectQuery.eq('series_id', args.series_id);
          }

          const { data: shiftsToDelete, error: selectError } = await selectQuery;

          if (selectError) {
            toolResult = JSON.stringify({
              status: 'error',
              inserted: [],
              updated: [],
              deleted: [],
              shift_summary: 'Kunne ikke hente skift for sletting'
            });
          } else if (!shiftsToDelete || shiftsToDelete.length === 0) {
            toolResult = JSON.stringify({
              status: 'error',
              inserted: [],
              updated: [],
              deleted: [],
              shift_summary: `Ingen skift funnet for ${criteriaDescription}`
            });
          } else {
            // Perform the deletion
            const { error } = await deleteQuery;

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
                status: 'ok',
                inserted: [],
                updated: [],
                deleted: shiftsToDelete,
                shift_summary: `${shiftsToDelete.length} skift slettet for ${criteriaDescription} (${totalHours} timer)`
              });
            }
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
          // If no week_number/year specified, get current week
          const { start, end } = getCurrentWeekDateRange();
          selectQuery = selectQuery.gte('shift_date', start).lte('shift_date', end);
          criteriaDescription = 'denne uka';
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
          // Get user settings for wage calculations
          const userSettings = await getUserSettings(user_id);

          // Calculate detailed wage data for each shift
          let totalHours = 0;
          let totalEarnings = 0;

          const detailedShifts = shifts.map(shift => {
            const calc = calculateShiftEarnings(shift, userSettings);
            totalHours += calc.hours;
            totalEarnings += calc.total;

            return {
              id: shift.id,
              date: shift.shift_date,
              startTime: shift.start_time,
              endTime: shift.end_time,
              type: shift.shift_type,
              duration: calc.totalHours,
              paidHours: calc.hours,
              baseWage: calc.baseWage,
              bonus: calc.bonus,
              totalEarnings: calc.total,
              pauseDeducted: calc.pauseDeducted
            };
          });

          // Format shifts for tool content with earnings info
          const formattedShifts = detailedShifts.map(shift =>
            `ID:${shift.id} ${shift.date} ${shift.startTime}-${shift.endTime} (${shift.paidHours}t, ${shift.totalEarnings}kr)`
          ).join(', ');

          toolResult = `OK: ${shifts.length} skift funnet for ${criteriaDescription} (${totalHours.toFixed(1)} timer, ${totalEarnings.toFixed(0)}kr totalt). Skift: ${formattedShifts}`;
        }
      }
    }

    if (fnName === 'copyShift') {
      // Find the source shift using natural language reference
      const { shifts: sourceShifts, error } = await findShiftsByReference(
        user_id,
        args.source_date_reference,
        args.source_time_reference
      );

      if (error) {
        toolResult = JSON.stringify({
          status: 'error',
          inserted: [],
          updated: [],
          deleted: [],
          shift_summary: `Kunne ikke finne kildeskift: ${error}`
        });
      } else if (sourceShifts.length === 0) {
        toolResult = JSON.stringify({
          status: 'error',
          inserted: [],
          updated: [],
          deleted: [],
          shift_summary: 'Ingen skift funnet for den referansen'
        });
      } else if (sourceShifts.length > 1) {
        const shiftList = sourceShifts.map(s => `${s.start_time}-${s.end_time}`).join(', ');
        toolResult = JSON.stringify({
          status: 'error',
          inserted: [],
          updated: [],
          deleted: [],
          shift_summary: `Flere skift funnet (${shiftList}). Vennligst presiser hvilken du vil kopiere`
        });
      } else {
        // Found exactly one source shift
        const sourceShift = sourceShifts[0];
        let targetDates = [];

        // Determine target dates
        if (args.target_dates && args.target_dates.length > 0) {
          targetDates = args.target_dates;
        } else if (args.target_date_references && args.target_date_references.length > 0) {
          // Parse natural language target date references
          for (const ref of args.target_date_references) {
            const parsedDate = parseNaturalDate(ref);
            if (parsedDate) {
              targetDates.push(parsedDate);
            }
          }
        } else if (args.weeks_ahead) {
          // Generate dates for the same weekday for the specified number of weeks ahead
          const sourceDate = new Date(sourceShift.shift_date);
          const sourceDayOfWeek = sourceDate.getDay();

          for (let week = 1; week <= args.weeks_ahead; week++) {
            const targetDate = new Date(sourceDate);
            targetDate.setDate(sourceDate.getDate() + (week * 7));
            targetDates.push(targetDate.toISOString().slice(0, 10));
          }
        }

        if (targetDates.length === 0) {
          toolResult = JSON.stringify({
            status: 'error',
            inserted: [],
            updated: [],
            deleted: [],
            shift_summary: 'Ingen måldatoer spesifisert eller kunne ikke tolke datoene'
          });
        } else {
          // Create shifts for target dates
          const newShifts = targetDates.map(date => ({
            user_id,
            shift_date: date,
            start_time: sourceShift.start_time,
            end_time: sourceShift.end_time,
            shift_type: sourceShift.shift_type || 0
          }));

          // Check for existing shifts to avoid duplicates
          const { data: existingShifts } = await supabase
            .from('user_shifts')
            .select('shift_date, start_time, end_time')
            .eq('user_id', user_id)
            .in('shift_date', targetDates);

          const existingKeys = new Set(
            existingShifts?.map(s => `${s.shift_date}|${s.start_time}|${s.end_time}`) || []
          );

          const shiftsToInsert = newShifts.filter(shift =>
            !existingKeys.has(`${shift.shift_date}|${shift.start_time}|${shift.end_time}`)
          );

          if (shiftsToInsert.length === 0) {
            toolResult = JSON.stringify({
              status: 'error',
              inserted: [],
              updated: [],
              deleted: [],
              shift_summary: 'Alle skift eksisterer allerede for de spesifiserte datoene'
            });
          } else {
            // Insert new shifts
            const { data: insertedShifts, error: insertError } = await supabase
              .from('user_shifts')
              .insert(shiftsToInsert)
              .select();

            if (insertError) {
              toolResult = JSON.stringify({
                status: 'error',
                inserted: [],
                updated: [],
                deleted: [],
                shift_summary: 'Kunne ikke kopiere skift'
              });
            } else {
              const totalHours = shiftsToInsert.reduce((sum, shift) => {
                return sum + hoursBetween(shift.start_time, shift.end_time);
              }, 0);

              toolResult = JSON.stringify({
                status: 'ok',
                inserted: insertedShifts || shiftsToInsert,
                updated: [],
                deleted: [],
                shift_summary: `${shiftsToInsert.length} skift kopiert fra ${sourceShift.shift_date} (${totalHours} timer totalt)`
              });
            }
          }
        }
      }
    }

    // New wage data functions
    if (fnName === 'getWageDataByWeek') {
      let selectQuery = supabase
        .from('user_shifts')
        .select('*')
        .eq('user_id', user_id)
        .order('shift_date');

      let criteriaDescription = '';

      if (!args.week_number || !args.year) {
        // If no week_number/year specified, get current week
        const { start, end } = getCurrentWeekDateRange();
        selectQuery = selectQuery.gte('shift_date', start).lte('shift_date', end);
        criteriaDescription = 'denne uka';
      } else {
        const { start, end } = getWeekDateRange(args.week_number, args.year);
        selectQuery = selectQuery.gte('shift_date', start).lte('shift_date', end);
        criteriaDescription = `uke ${args.week_number} i ${args.year}`;
      }

      const { data: shifts, error } = await selectQuery;

      if (error) {
        toolResult = 'ERROR: Kunne ikke hente lønnsdata';
      } else if (!shifts || shifts.length === 0) {
        toolResult = `NONE: Ingen skift funnet for ${criteriaDescription}`;
      } else {
        // Get user settings for wage calculations
        const userSettings = await getUserSettings(user_id);

        // Calculate detailed wage data for each shift
        let totalHours = 0;
        let totalEarnings = 0;
        let totalBaseWage = 0;
        let totalBonus = 0;

        const detailedShifts = shifts.map(shift => {
          const calc = calculateShiftEarnings(shift, userSettings);
          totalHours += calc.hours;
          totalEarnings += calc.total;
          totalBaseWage += calc.baseWage;
          totalBonus += calc.bonus;

          return {
            id: shift.id,
            date: shift.shift_date,
            startTime: shift.start_time,
            endTime: shift.end_time,
            type: shift.shift_type,
            duration: calc.totalHours,
            paidHours: calc.hours,
            baseWage: calc.baseWage,
            bonus: calc.bonus,
            totalEarnings: calc.total,
            pauseDeducted: calc.pauseDeducted
          };
        });

        toolResult = JSON.stringify({
          period: criteriaDescription,
          shifts: detailedShifts,
          summary: {
            totalShifts: shifts.length,
            totalHours: parseFloat(totalHours.toFixed(2)),
            totalEarnings: parseFloat(totalEarnings.toFixed(2)),
            totalBaseWage: parseFloat(totalBaseWage.toFixed(2)),
            totalBonus: parseFloat(totalBonus.toFixed(2)),
            averageHoursPerShift: parseFloat((totalHours / shifts.length).toFixed(2)),
            averageEarningsPerShift: parseFloat((totalEarnings / shifts.length).toFixed(2))
          }
        });
      }
    }

    if (fnName === 'getWageDataByMonth') {
      // Use viewing context if no month/year specified
      const targetMonth = args.month || viewingMonth;
      const targetYear = args.year || viewingYear;

      const firstDay = new Date(targetYear, targetMonth - 1, 1).toISOString().slice(0, 10);
      const lastDay = new Date(targetYear, targetMonth, 0).toISOString().slice(0, 10);

      const { data: shifts, error } = await supabase
        .from('user_shifts')
        .select('*')
        .eq('user_id', user_id)
        .gte('shift_date', firstDay)
        .lte('shift_date', lastDay)
        .order('shift_date');

      const monthNames = ['januar', 'februar', 'mars', 'april', 'mai', 'juni', 'juli', 'august', 'september', 'oktober', 'november', 'desember'];
      const criteriaDescription = `${monthNames[targetMonth - 1]} ${targetYear}`;

      if (error) {
        toolResult = 'ERROR: Kunne ikke hente lønnsdata';
      } else if (!shifts || shifts.length === 0) {
        toolResult = `NONE: Ingen skift funnet for ${criteriaDescription}`;
      } else {
        // Get user settings for wage calculations
        const userSettings = await getUserSettings(user_id);

        // Calculate detailed wage data for each shift
        let totalHours = 0;
        let totalEarnings = 0;
        let totalBaseWage = 0;
        let totalBonus = 0;

        const detailedShifts = shifts.map(shift => {
          const calc = calculateShiftEarnings(shift, userSettings);
          totalHours += calc.hours;
          totalEarnings += calc.total;
          totalBaseWage += calc.baseWage;
          totalBonus += calc.bonus;

          return {
            id: shift.id,
            date: shift.shift_date,
            startTime: shift.start_time,
            endTime: shift.end_time,
            type: shift.shift_type,
            duration: calc.totalHours,
            paidHours: calc.hours,
            baseWage: calc.baseWage,
            bonus: calc.bonus,
            totalEarnings: calc.total,
            pauseDeducted: calc.pauseDeducted
          };
        });

        toolResult = JSON.stringify({
          period: criteriaDescription,
          shifts: detailedShifts,
          summary: {
            totalShifts: shifts.length,
            totalHours: parseFloat(totalHours.toFixed(2)),
            totalEarnings: parseFloat(totalEarnings.toFixed(2)),
            totalBaseWage: parseFloat(totalBaseWage.toFixed(2)),
            totalBonus: parseFloat(totalBonus.toFixed(2)),
            averageHoursPerShift: parseFloat((totalHours / shifts.length).toFixed(2)),
            averageEarningsPerShift: parseFloat((totalEarnings / shifts.length).toFixed(2))
          }
        });
      }
    }

    if (fnName === 'getWageDataByDateRange') {
      const { data: shifts, error } = await supabase
        .from('user_shifts')
        .select('*')
        .eq('user_id', user_id)
        .gte('shift_date', args.from_date)
        .lte('shift_date', args.to_date)
        .order('shift_date');

      const criteriaDescription = `${args.from_date} til ${args.to_date}`;

      if (error) {
        toolResult = 'ERROR: Kunne ikke hente lønnsdata';
      } else if (!shifts || shifts.length === 0) {
        toolResult = `NONE: Ingen skift funnet for perioden ${criteriaDescription}`;
      } else {
        // Get user settings for wage calculations
        const userSettings = await getUserSettings(user_id);

        // Calculate detailed wage data for each shift
        let totalHours = 0;
        let totalEarnings = 0;
        let totalBaseWage = 0;
        let totalBonus = 0;

        const detailedShifts = shifts.map(shift => {
          const calc = calculateShiftEarnings(shift, userSettings);
          totalHours += calc.hours;
          totalEarnings += calc.total;
          totalBaseWage += calc.baseWage;
          totalBonus += calc.bonus;

          return {
            id: shift.id,
            date: shift.shift_date,
            startTime: shift.start_time,
            endTime: shift.end_time,
            type: shift.shift_type,
            duration: calc.totalHours,
            paidHours: calc.hours,
            baseWage: calc.baseWage,
            bonus: calc.bonus,
            totalEarnings: calc.total,
            pauseDeducted: calc.pauseDeducted
          };
        });

        toolResult = JSON.stringify({
          period: criteriaDescription,
          shifts: detailedShifts,
          summary: {
            totalShifts: shifts.length,
            totalHours: parseFloat(totalHours.toFixed(2)),
            totalEarnings: parseFloat(totalEarnings.toFixed(2)),
            totalBaseWage: parseFloat(totalBaseWage.toFixed(2)),
            totalBonus: parseFloat(totalBonus.toFixed(2)),
            averageHoursPerShift: parseFloat((totalHours / shifts.length).toFixed(2)),
            averageEarningsPerShift: parseFloat((totalEarnings / shifts.length).toFixed(2))
          }
        });
      }
    }

    return toolResult;
}

// ---------- export / run ----------
export default app;

// Start server (kun når filen kjøres direkte)
if (import.meta.url === `file://${process.argv[1]}`) {
  const PORT = process.env.PORT || 5173;
  app.listen(PORT, () =>
    console.log(`✔ Server running → http://localhost:${PORT}`)
  );
}