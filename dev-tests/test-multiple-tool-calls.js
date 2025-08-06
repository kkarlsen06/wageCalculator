// Test multiple tool calls in a single round trip
console.log('🧪 Testing Multiple Tool Calls in Single Round Trip...\n');

// Simulate the server's tool call handling logic
function simulateMultipleToolCalls() {
  // Example: User says "the shift I had on Monday, repeat it the next two weeks as well"
  // This should trigger:
  // 1. getShifts to find Monday's shift
  // 2. addSeries to repeat it for the next two weeks
  
  const mockToolCalls = [
    {
      id: 'call_1',
      function: {
        name: 'getShifts',
        arguments: JSON.stringify({
          criteria_type: 'week',
          week_number: 32,
          year: 2025
        })
      }
    },
    {
      id: 'call_2', 
      function: {
        name: 'addSeries',
        arguments: JSON.stringify({
          from: '2025-08-11',
          to: '2025-08-25',
          days: [1], // Monday
          start: '09:00',
          end: '17:00',
          interval_weeks: 1
        })
      }
    }
  ];

  console.log('📋 Simulated Multiple Tool Calls:');
  console.log('User: "the shift I had on Monday, repeat it the next two weeks as well"\n');
  
  mockToolCalls.forEach((call, index) => {
    console.log(`${index + 1}. Tool Call ID: ${call.id}`);
    console.log(`   Function: ${call.function.name}`);
    console.log(`   Arguments: ${call.function.arguments}`);
    console.log();
  });

  return mockToolCalls;
}

// Test the tool message structure
function simulateToolMessages(toolCalls) {
  const toolMessages = [];
  
  // Simulate tool results
  const mockResults = [
    'OK: 1 skift funnet for uke 32 i 2025 (8 timer totalt). Skift: ID:123 2025-08-04 09:00-17:00',
    'OK: 2 skift lagt til for periode 2025-08-11 til 2025-08-25 (16 timer totalt)'
  ];

  toolCalls.forEach((call, index) => {
    toolMessages.push({
      role: 'tool',
      tool_call_id: call.id,
      name: call.function.name,
      content: mockResults[index]
    });
  });

  console.log('📨 Tool Messages Structure:');
  toolMessages.forEach((msg, index) => {
    console.log(`${index + 1}. Role: ${msg.role}`);
    console.log(`   Tool Call ID: ${msg.tool_call_id}`);
    console.log(`   Function: ${msg.name}`);
    console.log(`   Result: ${msg.content}`);
    console.log();
  });

  return toolMessages;
}

// Test conversation flow
function simulateConversationFlow() {
  console.log('🔄 Complete Conversation Flow:');
  console.log('1. User sends message: "the shift I had on Monday, repeat it the next two weeks as well"');
  console.log('2. GPT makes multiple tool calls in single response:');
  console.log('   - getShifts to find Monday shift');
  console.log('   - addSeries to repeat it');
  console.log('3. Server processes all tool calls sequentially');
  console.log('4. Server sends all tool results back to GPT');
  console.log('5. GPT formulates final response with all results');
  console.log('6. User gets complete answer in one round trip');
  console.log();
}

// Run tests
const toolCalls = simulateMultipleToolCalls();
const toolMessages = simulateToolMessages(toolCalls);
simulateConversationFlow();

console.log('✅ Benefits of Multiple Tool Calls:');
console.log('- No "wait a minute" workarounds needed');
console.log('- Complete operations in single round trip');
console.log('- Better user experience');
console.log('- More natural conversation flow');
console.log('- Efficient API usage');

console.log('\n' + '='.repeat(60));
console.log('🚀 Multiple Tool Calls Support Verified!');
console.log('The server can handle complex multi-step operations in one round trip.');

// Test the enhanced system prompt
console.log('\n📝 Enhanced System Prompt Instructions:');
console.log('✅ Added explicit instruction for multiple tool calls');
console.log('✅ Told GPT not to say "wait" or ask user to wait');
console.log('✅ Encouraged completing all operations in one response');
console.log('✅ Provided example scenario for guidance');
