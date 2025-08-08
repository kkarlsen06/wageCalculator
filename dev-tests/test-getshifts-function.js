import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

function getCurrentWeekDateRange() {
  const today = new Date();
  const currentDay = today.getDay();
  console.log('Today:', today.toISOString().slice(0, 10), 'Day of week:', currentDay);

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

async function testGetShiftsFunction() {
  try {
    console.log('Testing getShifts function logic...');
    
    const user_id = 'de61a2a0-1622-4e5d-bc6a-de015f1e63fc';
    
    // Simulate the getShifts function logic
    let selectQuery = supabase
      .from('user_shifts')
      .select('*')
      .eq('user_id', user_id)
      .order('shift_date');

    // Simulate week criteria with invalid week_number (0)
    const args = { criteria_type: 'week', week_number: 0, year: 0 };
    
    if (args.criteria_type === 'week') {
      if (!args.week_number || !args.year || args.week_number <= 0 || args.year <= 0) {
        // If no week_number/year specified or invalid values, get current week
        const { start, end } = getCurrentWeekDateRange();
        console.log('Using current week range:', { start, end });
        selectQuery = selectQuery.gte('shift_date', start).lte('shift_date', end);
      }
    }

    const { data: shifts, error } = await selectQuery;

    if (error) {
      console.error('Database error:', error);
      return;
    }

    console.log('\nShifts returned by getShifts function:');
    console.log('Total shifts found:', shifts.length);
    
    if (shifts.length > 0) {
      shifts.forEach((shift, index) => {
        console.log(`${index + 1}. Date: ${shift.shift_date}, Time: ${shift.start_time}-${shift.end_time}`);
      });
    } else {
      console.log('No shifts found for current week');
    }

    // Also check what shifts exist for this user in the current week manually
    console.log('\n--- Manual check for current week shifts ---');
    const { start, end } = getCurrentWeekDateRange();
    const { data: manualShifts, error: manualError } = await supabase
      .from('user_shifts')
      .select('*')
      .eq('user_id', user_id)
      .gte('shift_date', start)
      .lte('shift_date', end)
      .order('shift_date');

    if (manualError) {
      console.error('Manual query error:', manualError);
    } else {
      console.log('Manual query results:', manualShifts.length, 'shifts');
      manualShifts.forEach((shift, index) => {
        console.log(`${index + 1}. Date: ${shift.shift_date}, Time: ${shift.start_time}-${shift.end_time}`);
      });
    }

  } catch (error) {
    console.error('Error:', error);
  }
}

testGetShiftsFunction();
