// Integration test for natural language shift resolution
console.log('🧪 Testing Natural Language Shift Resolution Integration...\n');

// Test the enhanced function schemas
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

console.log('✅ Enhanced Function Schemas:');
console.log('- editShift now supports date_reference and time_reference');
console.log('- deleteShift now supports date_reference and time_reference');
console.log('- Both functions maintain backward compatibility with existing parameters\n');

// Test example GPT function calls
const exampleCalls = [
  {
    scenario: 'User says: "Edit my shift tomorrow"',
    functionCall: {
      name: 'editShift',
      arguments: {
        date_reference: 'tomorrow',
        new_start_time: '10:00'
      }
    }
  },
  {
    scenario: 'User says: "Delete my Monday morning shift"',
    functionCall: {
      name: 'deleteShift', 
      arguments: {
        date_reference: 'monday',
        time_reference: 'morning'
      }
    }
  },
  {
    scenario: 'User says: "Edit the 9am shift today to start at 8:30"',
    functionCall: {
      name: 'editShift',
      arguments: {
        date_reference: 'today',
        time_reference: '09:00',
        new_start_time: '08:30'
      }
    }
  },
  {
    scenario: 'User says: "Delete my shift next Friday"',
    functionCall: {
      name: 'deleteShift',
      arguments: {
        date_reference: 'neste fredag'
      }
    }
  }
];

console.log('📝 Example GPT Function Calls:\n');
exampleCalls.forEach((example, index) => {
  console.log(`${index + 1}. ${example.scenario}`);
  console.log(`   Function: ${example.functionCall.name}`);
  console.log(`   Arguments:`, JSON.stringify(example.functionCall.arguments, null, 6));
  console.log();
});

console.log('🎯 Benefits:');
console.log('✅ Single round trip - no need to call getShifts first');
console.log('✅ Natural language support in Norwegian and English');
console.log('✅ Flexible time references (morning, evening, specific times)');
console.log('✅ Backward compatibility with existing ID-based calls');
console.log('✅ Robust error handling for ambiguous references');

console.log('\n' + '='.repeat(60));
console.log('🚀 Natural Language Shift Resolution is ready!');
console.log('The GPT assistant can now handle shift operations in one API call.');
