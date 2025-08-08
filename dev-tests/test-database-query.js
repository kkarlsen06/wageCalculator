import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testDatabaseQuery() {
  try {
    console.log('Testing database query for current week shifts...');
    
    // Calculate current week range
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

    const { start, end } = getCurrentWeekDateRange();
    console.log('Current week range:', { start, end });

    // Query all shifts for current week
    const { data: shifts, error } = await supabase
      .from('user_shifts')
      .select('*')
      .gte('shift_date', start)
      .lte('shift_date', end)
      .order('shift_date');

    if (error) {
      console.error('Database error:', error);
      return;
    }

    console.log('\nAll shifts in current week:');
    console.log('Total shifts found:', shifts.length);
    
    if (shifts.length > 0) {
      shifts.forEach((shift, index) => {
        console.log(`${index + 1}. Date: ${shift.shift_date}, Time: ${shift.start_time}-${shift.end_time}, User: ${shift.user_id}`);
      });
    } else {
      console.log('No shifts found in the current week range');
    }

    // Also query all shifts to see what's in the database
    console.log('\n--- All shifts in database ---');
    const { data: allShifts, error: allError } = await supabase
      .from('user_shifts')
      .select('*')
      .order('shift_date');

    if (allError) {
      console.error('Error querying all shifts:', allError);
    } else {
      console.log('Total shifts in database:', allShifts.length);
      allShifts.forEach((shift, index) => {
        console.log(`${index + 1}. Date: ${shift.shift_date}, Time: ${shift.start_time}-${shift.end_time}, User: ${shift.user_id}`);
      });
    }

  } catch (error) {
    console.error('Error:', error);
  }
}

testDatabaseQuery();
