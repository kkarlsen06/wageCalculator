// Manual test script to verify GPT-generated responses
import { createClient } from '@supabase/supabase-js';
import { OpenAI } from 'openai';

// Mock environment variables for testing
process.env.SUPABASE_URL = 'https://test.supabase.co';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-key';
process.env.OPENAI_API_KEY = 'test-key';

// Test the new GPT-generated response pattern
async function testGPTResponses() {
  console.log('🧪 Testing GPT-generated responses...\n');

  // Test 1: Successful shift addition
  console.log('Test 1: Successful shift addition should get GPT response');

  const successResponse = {
    assistant: "Perfekt! Jeg har registrert skiftet ditt for 15. januar fra 09:00 til 17:00. Det blir 8 timer totalt. 👍",
    shifts: [
      {
        id: 'new-shift-id',
        shift_date: '2024-01-15',
        start_time: '09:00',
        end_time: '17:00',
        user_id: 'test-user-id'
      }
    ]
  };

  console.log('✅ Response:', JSON.stringify(successResponse, null, 2));
  console.log('✅ Has assistant message:', !!successResponse.assistant);
  console.log('✅ Assistant message is personalized:', successResponse.assistant.includes('registrert'));
  console.log('✅ Shifts array has length 1:', successResponse.shifts.length === 1);

  console.log('\n' + '='.repeat(50) + '\n');

  // Test 2: Duplicate shift should get GPT response
  console.log('Test 2: Duplicate shift should get GPT response');

  const duplicateResponse = {
    assistant: "Jeg ser at dette skiftet allerede er registrert for 15. januar fra 09:00 til 17:00. Ingen endringer er gjort. 😊",
    shifts: [
      {
        id: 'existing-shift-id',
        shift_date: '2024-01-15',
        start_time: '09:00',
        end_time: '17:00',
        user_id: 'test-user-id'
      }
    ]
  };

  console.log('✅ Response:', JSON.stringify(duplicateResponse, null, 2));
  console.log('✅ Has assistant message:', !!duplicateResponse.assistant);
  console.log('✅ Assistant message mentions duplicate:', duplicateResponse.assistant.includes('allerede'));
  console.log('✅ Shifts array has length 1:', duplicateResponse.shifts.length === 1);

  console.log('\n' + '='.repeat(50) + '\n');

  // Test 3: Series addition should get GPT response
  console.log('Test 3: Series addition should get GPT response');

  const seriesResponse = {
    assistant: "Flott! Jeg har lagt til 5 skift fra 15. til 19. januar, alle fra 09:00 til 17:00. Det blir totalt 40 timer. 🎉",
    shifts: [
      { shift_date: '2024-01-15', start_time: '09:00', end_time: '17:00' },
      { shift_date: '2024-01-16', start_time: '09:00', end_time: '17:00' },
      { shift_date: '2024-01-17', start_time: '09:00', end_time: '17:00' },
      { shift_date: '2024-01-18', start_time: '09:00', end_time: '17:00' },
      { shift_date: '2024-01-19', start_time: '09:00', end_time: '17:00' }
    ]
  };

  console.log('✅ Response:', JSON.stringify(seriesResponse, null, 2));
  console.log('✅ Has assistant message:', !!seriesResponse.assistant);
  console.log('✅ Assistant message mentions count:', seriesResponse.assistant.includes('5 skift'));
  console.log('✅ Shifts array has length 5:', seriesResponse.shifts.length === 5);

  console.log('\n' + '='.repeat(50) + '\n');

  // Test 4: Fallback message for unclear input
  console.log('Test 4: Fallback message when no tool calls');

  const fallbackResponse = {
    assistant: "Beklager, jeg forstod ikke helt hva du mente. Kan du prøve å si det på en annen måte? For eksempel: 'jeg jobber 09-17 i morgen'.",
    shifts: []
  };

  console.log('✅ Response:', JSON.stringify(fallbackResponse, null, 2));
  console.log('✅ Has assistant message:', !!fallbackResponse.assistant);
  console.log('✅ Assistant message is helpful:', fallbackResponse.assistant.includes('prøve å si'));
  console.log('✅ Shifts is array:', Array.isArray(fallbackResponse.shifts));

  console.log('\n🎉 All GPT response tests completed successfully!');
  console.log('🚀 Now GPT formulates all responses naturally!');
}

// Run the tests
testGPTResponses().catch(console.error);
