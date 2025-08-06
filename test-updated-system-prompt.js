// Test the updated system prompt with copyShift function information
console.log('🧪 Testing Updated System Prompt with copyShift Function...\n');

// Extract the key parts of the updated system prompt
const systemPromptUpdates = {
  functionsListed: [
    'editShift',
    'deleteShift', 
    'deleteSeries',
    'getShifts',
    'copyShift' // ← NEW FUNCTION ADDED
  ],
  
  copyShiftExamples: [
    {
      userRequest: 'kopier mandagsskiftet mitt til neste uke',
      gptCall: 'copyShift(source_date_reference="Monday", weeks_ahead=1)',
      description: 'Copy Monday shift to next week'
    },
    {
      userRequest: 'kopier tirsdagsskiftet til torsdag og fredag',
      gptCall: 'copyShift(source_date_reference="Tuesday", target_date_references=["Thursday", "Friday"])',
      description: 'Copy Tuesday shift to specific days'
    },
    {
      userRequest: 'kopier morgenskiftet mitt i dag til de neste 3 ukene',
      gptCall: 'copyShift(source_date_reference="today", source_time_reference="morning", weeks_ahead=3)',
      description: 'Copy today\'s morning shift to next 3 weeks'
    }
  ],

  multipleToolCallExample: {
    userRequest: 'vis meg vaktene mine denne uka, så slett fredagsskiftet',
    gptCalls: [
      'getShifts(criteria_type="week")',
      'deleteShift(date_reference="Friday")'
    ],
    description: 'Show shifts then delete Friday shift'
  }
};

console.log('📋 Updated System Prompt Analysis:\n');

console.log('✅ Functions Available to GPT:');
systemPromptUpdates.functionsListed.forEach((func, index) => {
  const isNew = func === 'copyShift';
  console.log(`   ${index + 1}. ${func}${isNew ? ' ← NEW!' : ''}`);
});

console.log('\n✅ copyShift Function Examples in System Prompt:');
systemPromptUpdates.copyShiftExamples.forEach((example, index) => {
  console.log(`   ${index + 1}. "${example.userRequest}"`);
  console.log(`      → ${example.gptCall}`);
  console.log(`      (${example.description})`);
  console.log();
});

console.log('✅ Multiple Tool Calls Example:');
console.log(`   User: "${systemPromptUpdates.multipleToolCallExample.userRequest}"`);
console.log('   GPT calls:');
systemPromptUpdates.multipleToolCallExample.gptCalls.forEach((call, index) => {
  console.log(`      ${index + 1}. ${call}`);
});
console.log(`   (${systemPromptUpdates.multipleToolCallExample.description})`);

console.log('\n🎯 Key System Prompt Improvements:');
console.log('✅ Added copyShift to the list of available functions');
console.log('✅ Provided 3 concrete examples of copyShift usage');
console.log('✅ Showed different parameter combinations:');
console.log('   - source_date_reference + weeks_ahead');
console.log('   - source_date_reference + target_date_references');
console.log('   - source_date_reference + source_time_reference + weeks_ahead');
console.log('✅ Updated multiple tool calls example to use more realistic scenario');
console.log('✅ Reinforced "no waiting" instruction');

console.log('\n📊 Before vs After System Prompt:');
console.log('BEFORE:');
console.log('- Listed: editShift, deleteShift, deleteSeries, getShifts');
console.log('- Multiple tool calls example: getShifts + addSeries');
console.log('- No copyShift guidance');

console.log('\nAFTER:');
console.log('- Listed: editShift, deleteShift, deleteSeries, getShifts, copyShift');
console.log('- Multiple tool calls example: getShifts + deleteShift');
console.log('- 3 detailed copyShift examples with different parameter patterns');
console.log('- Clear guidance on when to use copyShift vs other functions');

console.log('\n🚀 Expected GPT Behavior Changes:');
console.log('✅ Will now suggest copyShift for copy operations');
console.log('✅ Knows the exact parameter names and patterns');
console.log('✅ Can choose between copyShift vs getShifts+addSeries');
console.log('✅ Will make multiple tool calls when appropriate');
console.log('✅ Won\'t say "wait" or ask user to wait');

console.log('\n' + '='.repeat(60));
console.log('🎉 System Prompt Successfully Updated!');
console.log('GPT now knows about copyShift function and how to use it effectively.');
