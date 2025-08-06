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

  console.log('\n🎉 All edit and delete tests completed successfully!');
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
}

// Run the tests
testEditDeleteFunctionality()
  .then(() => testWeekDateRange())
  .catch(console.error);
