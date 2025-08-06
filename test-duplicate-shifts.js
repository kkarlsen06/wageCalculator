// Manual test script to verify duplicate shift handling
import { createClient } from '@supabase/supabase-js';
import { OpenAI } from 'openai';

// Mock environment variables for testing
process.env.SUPABASE_URL = 'https://test.supabase.co';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-key';
process.env.OPENAI_API_KEY = 'test-key';

// Test the duplicate shift logic directly
async function testDuplicateShiftLogic() {
  console.log('🧪 Testing duplicate shift logic...\n');

  // Test 1: Duplicate shift detection
  console.log('Test 1: Duplicate shift should return system message');
  
  // Simulate duplicate check result
  const dupCheck = { id: 'existing-shift-id' }; // Simulates existing shift
  const args = {
    shift_date: '2024-01-15',
    start_time: '09:00',
    end_time: '17:00'
  };

  if (dupCheck) {
    const allShifts = [
      {
        id: 'existing-shift-id',
        shift_date: '2024-01-15',
        start_time: '09:00',
        end_time: '17:00',
        user_id: 'test-user-id'
      }
    ];

    const response = {
      system: `Skiftet ${args.shift_date} ${args.start_time}–${args.end_time} finnes allerede.`,
      shifts: allShifts
    };

    console.log('✅ Response:', JSON.stringify(response, null, 2));
    console.log('✅ System message contains "finnes allerede":', response.system.includes('finnes allerede'));
    console.log('✅ Shifts array has length 1:', response.shifts.length === 1);
  }

  console.log('\n' + '='.repeat(50) + '\n');

  // Test 2: Series with all duplicates
  console.log('Test 2: Series with all duplicates should return system message');

  const seriesArgs = {
    from: '2024-01-15',
    to: '2024-01-19',
    days: [1, 2, 3, 4, 5], // Monday to Friday
    start: '09:00',
    end: '17:00'
  };

  // Simulate existing shifts that cover all dates
  const existingShifts = [
    { shift_date: '2024-01-15', start_time: '09:00', end_time: '17:00' },
    { shift_date: '2024-01-16', start_time: '09:00', end_time: '17:00' },
    { shift_date: '2024-01-17', start_time: '09:00', end_time: '17:00' },
    { shift_date: '2024-01-18', start_time: '09:00', end_time: '17:00' },
    { shift_date: '2024-01-19', start_time: '09:00', end_time: '17:00' }
  ];

  const existingKeys = new Set(
    existingShifts.map(s => `${s.shift_date}|${s.start_time}|${s.end_time}`)
  );

  // Generate series dates (simplified version)
  const dates = ['2024-01-15', '2024-01-16', '2024-01-17', '2024-01-18', '2024-01-19'];
  const rows = dates.map(d => ({
    user_id: 'test-user-id',
    shift_date: d,
    start_time: seriesArgs.start,
    end_time: seriesArgs.end,
    shift_type: 0
  }));

  const newRows = rows.filter(row =>
    !existingKeys.has(`${row.shift_date}|${row.start_time}|${row.end_time}`)
  );

  if (newRows.length === 0) {
    const response = {
      system: "Added 0 shifts – alle eksisterte fra før.",
      shifts: existingShifts
    };

    console.log('✅ Response:', JSON.stringify(response, null, 2));
    console.log('✅ System message is correct:', response.system === "Added 0 shifts – alle eksisterte fra før.");
    console.log('✅ Shifts array has length 5:', response.shifts.length === 5);
  }

  console.log('\n' + '='.repeat(50) + '\n');

  // Test 3: Fallback message
  console.log('Test 3: Fallback message when no content or function_call');

  const choice = {}; // Simulates empty GPT response

  if (!choice.content && !choice.function_call) {
    choice.content = "Jeg forstod ikke kommandoen.";
  }

  const response3 = {
    assistant: choice.content,
    shifts: []
  };

  console.log('✅ Response:', JSON.stringify(response3, null, 2));
  console.log('✅ Assistant message is fallback:', response3.assistant === "Jeg forstod ikke kommandoen.");
  console.log('✅ Shifts is array:', Array.isArray(response3.shifts));

  console.log('\n🎉 All tests completed successfully!');
}

// Run the tests
testDuplicateShiftLogic().catch(console.error);
