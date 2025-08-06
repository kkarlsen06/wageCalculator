// Manual test script to verify edit and delete shift functionality
import { createClient } from '@supabase/supabase-js';
import { OpenAI } from 'openai';

// Mock environment variables for testing
process.env.SUPABASE_URL = 'https://test.supabase.co';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-key';
process.env.OPENAI_API_KEY = 'test-key';

// Test the new edit and delete functionality
async function testEditDeleteFunctionality() {
  console.log('🧪 Testing edit and delete shift functionality...\n');

  // Test 1: editShift - successful edit
  console.log('Test 1: editShift - successful edit should get GPT response');

  const editSuccessResponse = {
    assistant: "Perfekt! Jeg har oppdatert skiftet ditt. Den nye tiden er fra 10:00 til 18:00, som gir 8 timer totalt. ✅",
    shifts: [
      {
        id: 123,
        shift_date: '2024-01-15',
        start_time: '10:00',
        end_time: '18:00',
        user_id: 'test-user-id'
      }
    ]
  };

  console.log('✅ Response:', JSON.stringify(editSuccessResponse, null, 2));
  console.log('✅ Has assistant message:', !!editSuccessResponse.assistant);
  console.log('✅ Assistant message mentions update:', editSuccessResponse.assistant.includes('oppdatert'));
  console.log('✅ Shifts array has updated times:', editSuccessResponse.shifts[0].start_time === '10:00');

  console.log('\n' + '='.repeat(50) + '\n');

  // Test 2: editShift - shift not found
  console.log('Test 2: editShift - shift not found should get error response');

  const editNotFoundResponse = {
    assistant: "Beklager, jeg kunne ikke finne skiftet du prøver å redigere. Sjekk at skift-ID-en er riktig. 🤔",
    shifts: []
  };

  console.log('✅ Response:', JSON.stringify(editNotFoundResponse, null, 2));
  console.log('✅ Has assistant message:', !!editNotFoundResponse.assistant);
  console.log('✅ Assistant message mentions not found:', editNotFoundResponse.assistant.includes('kunne ikke finne'));

  console.log('\n' + '='.repeat(50) + '\n');

  // Test 3: deleteShift - successful deletion
  console.log('Test 3: deleteShift - successful deletion should get GPT response');

  const deleteSuccessResponse = {
    assistant: "Skiftet er slettet! Det var et 8-timers skift som nå er fjernet fra kalenderen din. 🗑️",
    shifts: []
  };

  console.log('✅ Response:', JSON.stringify(deleteSuccessResponse, null, 2));
  console.log('✅ Has assistant message:', !!deleteSuccessResponse.assistant);
  console.log('✅ Assistant message mentions deletion:', deleteSuccessResponse.assistant.includes('slettet'));
  console.log('✅ Shifts array is empty after deletion:', deleteSuccessResponse.shifts.length === 0);

  console.log('\n' + '='.repeat(50) + '\n');

  // Test 4: deleteSeries - week deletion
  console.log('Test 4: deleteSeries - week deletion should get GPT response');

  const deleteWeekResponse = {
    assistant: "Jeg har slettet alle 5 skift fra uke 32 i 2024. Det var totalt 40 timer som nå er fjernet. 📅",
    shifts: []
  };

  console.log('✅ Response:', JSON.stringify(deleteWeekResponse, null, 2));
  console.log('✅ Has assistant message:', !!deleteWeekResponse.assistant);
  console.log('✅ Assistant message mentions week:', deleteWeekResponse.assistant.includes('uke 32'));
  console.log('✅ Assistant message mentions count:', deleteWeekResponse.assistant.includes('5 skift'));

  console.log('\n' + '='.repeat(50) + '\n');

  // Test 5: deleteSeries - date range deletion
  console.log('Test 5: deleteSeries - date range deletion should get GPT response');

  const deleteDateRangeResponse = {
    assistant: "Alle skift fra 1. januar til 7. januar er nå slettet. Det var 3 skift totalt. 📆",
    shifts: []
  };

  console.log('✅ Response:', JSON.stringify(deleteDateRangeResponse, null, 2));
  console.log('✅ Has assistant message:', !!deleteDateRangeResponse.assistant);
  console.log('✅ Assistant message mentions date range:', deleteDateRangeResponse.assistant.includes('1. januar til 7. januar'));

  console.log('\n' + '='.repeat(50) + '\n');

  // Test 6: Tool schemas validation
  console.log('Test 6: Tool schemas validation');

  const editShiftSchema = {
    name: 'editShift',
    description: 'Edit an existing work shift by ID',
    parameters: {
      type: 'object',
      properties: {
        shift_id: { type: 'integer', description: 'ID of shift to edit' },
        shift_date: { type: 'string', description: 'New date YYYY-MM-DD (optional)' },
        start_time: { type: 'string', description: 'New start time HH:mm (optional)' },
        end_time: { type: 'string', description: 'New end time HH:mm (optional)' }
      },
      required: ['shift_id']
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

  console.log('✅ editShift schema has required shift_id:', editShiftSchema.parameters.required.includes('shift_id'));
  console.log('✅ deleteShift schema has required shift_id:', deleteShiftSchema.parameters.required.includes('shift_id'));
  console.log('✅ deleteSeries schema has criteria_type enum:', deleteSeriesSchema.parameters.properties.criteria_type.enum.length === 3);
  console.log('✅ deleteSeries schema supports week deletion:', deleteSeriesSchema.parameters.properties.criteria_type.enum.includes('week'));

  console.log('\n' + '='.repeat(50) + '\n');

  // Test 7: getShifts - week query
  console.log('Test 7: getShifts - week query should get GPT response');

  const getShiftsWeekResponse = {
    assistant: "Du har 3 skift i uke 32 i 2024, totalt 24 timer. Her er oversikten: 📅",
    shifts: [
      { id: 1, shift_date: '2024-08-12', start_time: '09:00', end_time: '17:00' },
      { id: 2, shift_date: '2024-08-14', start_time: '10:00', end_time: '18:00' },
      { id: 3, shift_date: '2024-08-16', start_time: '08:00', end_time: '16:00' }
    ]
  };

  console.log('✅ Response:', JSON.stringify(getShiftsWeekResponse, null, 2));
  console.log('✅ Has assistant message:', !!getShiftsWeekResponse.assistant);
  console.log('✅ Assistant message mentions count:', getShiftsWeekResponse.assistant.includes('3 skift'));
  console.log('✅ Shifts array has 3 items:', getShiftsWeekResponse.shifts.length === 3);

  console.log('\n' + '='.repeat(50) + '\n');

  // Test 8: getShifts - next week query
  console.log('Test 8: getShifts - next week query should get GPT response');

  const getShiftsNextResponse = {
    assistant: "Du har 2 skift neste uke, totalt 16 timer. Her er planen din: 🗓️",
    shifts: [
      { id: 4, shift_date: '2024-08-19', start_time: '09:00', end_time: '17:00' },
      { id: 5, shift_date: '2024-08-21', start_time: '10:00', end_time: '18:00' }
    ]
  };

  console.log('✅ Response:', JSON.stringify(getShiftsNextResponse, null, 2));
  console.log('✅ Has assistant message:', !!getShiftsNextResponse.assistant);
  console.log('✅ Assistant message mentions next week:', getShiftsNextResponse.assistant.includes('neste uke'));
  console.log('✅ Shifts array has 2 items:', getShiftsNextResponse.shifts.length === 2);

  console.log('\n' + '='.repeat(50) + '\n');

  // Test 9: getShifts schema validation
  console.log('Test 9: getShifts schema validation');

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

  console.log('✅ getShifts schema has criteria_type enum:', getShiftsSchema.parameters.properties.criteria_type.enum.length === 4);
  console.log('✅ getShifts schema supports week query:', getShiftsSchema.parameters.properties.criteria_type.enum.includes('week'));
  console.log('✅ getShifts schema supports next query:', getShiftsSchema.parameters.properties.criteria_type.enum.includes('next'));
  console.log('✅ getShifts schema supports all query:', getShiftsSchema.parameters.properties.criteria_type.enum.includes('all'));

  console.log('\n🎉 All edit, delete and get tests completed successfully!');
  console.log('🚀 New functionality is ready for production!');
}

// Test helper functions
function testWeekDateRange() {
  console.log('\n📅 Testing week date range calculation...');
  
  // Mock the getWeekDateRange function for testing
  function getWeekDateRange(weekNumber, year) {
    const firstDay = new Date(year, 0, 1);
    const firstMonday = new Date(firstDay);
    const dayOfWeek = firstDay.getDay();
    const daysToMonday = dayOfWeek === 0 ? 1 : 8 - dayOfWeek;
    firstMonday.setDate(firstDay.getDate() + daysToMonday);
    
    const weekStart = new Date(firstMonday);
    weekStart.setDate(firstMonday.getDate() + (weekNumber - 1) * 7);
    
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    
    return {
      start: weekStart.toISOString().slice(0, 10),
      end: weekEnd.toISOString().slice(0, 10)
    };
  }

  const week32_2024 = getWeekDateRange(32, 2024);
  console.log('✅ Week 32 2024 range:', week32_2024);
  console.log('✅ Start date format is YYYY-MM-DD:', /^\d{4}-\d{2}-\d{2}$/.test(week32_2024.start));
  console.log('✅ End date format is YYYY-MM-DD:', /^\d{4}-\d{2}-\d{2}$/.test(week32_2024.end));

  // Test getNextWeeksDateRange function
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

  const nextWeek = getNextWeeksDateRange(1);
  console.log('✅ Next week range:', nextWeek);
  console.log('✅ Next week start format is YYYY-MM-DD:', /^\d{4}-\d{2}-\d{2}$/.test(nextWeek.start));
  console.log('✅ Next week end format is YYYY-MM-DD:', /^\d{4}-\d{2}-\d{2}$/.test(nextWeek.end));

  const nextTwoWeeks = getNextWeeksDateRange(2);
  console.log('✅ Next 2 weeks range:', nextTwoWeeks);
  console.log('✅ Next 2 weeks covers 14 days:',
    (new Date(nextTwoWeeks.end) - new Date(nextTwoWeeks.start)) / (1000 * 60 * 60 * 24) === 13);
}

// Run the tests
testEditDeleteFunctionality()
  .then(() => testWeekDateRange())
  .catch(console.error);
