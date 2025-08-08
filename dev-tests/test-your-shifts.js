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

async function testYourShifts() {
  try {
    console.log('Testing shifts for your user ID...');
    
    const your_user_id = '032d8c2a-9af6-4777-99f0-24e2c4058bf3';
    const { start, end } = getCurrentWeekDateRange();
    
    console.log('Current week range:', { start, end });

    // Query your shifts for current week
    const { data: shifts, error } = await supabase
      .from('user_shifts')
      .select('*')
      .eq('user_id', your_user_id)
      .gte('shift_date', start)
      .lte('shift_date', end)
      .order('shift_date');

    if (error) {
      console.error('Database error:', error);
      return;
    }

    console.log('\nYour shifts in current week:');
    console.log('Total shifts found:', shifts.length);
    
    if (shifts.length > 0) {
      shifts.forEach((shift, index) => {
        console.log(`${index + 1}. Date: ${shift.shift_date}, Time: ${shift.start_time}-${shift.end_time}`);
      });
    } else {
      console.log('No shifts found for current week');
    }

  } catch (error) {
    console.error('Error:', error);
  }
}

testYourShifts();
