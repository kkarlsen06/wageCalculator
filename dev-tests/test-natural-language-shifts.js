// Test natural language shift parsing
console.log('🧪 Testing Natural Language Shift Parsing...\n');

// Mock the parseNaturalDate function for testing
function parseNaturalDate(dateReference) {
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  
  const dayNames = ['søndag', 'mandag', 'tirsdag', 'onsdag', 'torsdag', 'fredag', 'lørdag'];
  const dayNamesEn = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  
  const ref = dateReference.toLowerCase().trim();
  
  // Handle specific cases
  if (ref === 'today' || ref === 'i dag' || ref === 'idag') {
    return today.toISOString().slice(0, 10);
  }
  
  if (ref === 'tomorrow' || ref === 'i morgen' || ref === 'imorgen') {
    return tomorrow.toISOString().slice(0, 10);
  }
  
  // Handle weekday names (Norwegian and English)
  const allDayNames = [...dayNames, ...dayNamesEn];
  for (let i = 0; i < allDayNames.length; i++) {
    const dayName = allDayNames[i];
    if (ref === dayName || ref === `neste ${dayName}` || ref === `next ${dayName}`) {
      const targetDay = i % 7; // Get day index (0 = Sunday, 1 = Monday, etc.)
      const currentDay = today.getDay();
      
      let daysToAdd;
      if (ref.includes('neste') || ref.includes('next')) {
        // Next occurrence of this weekday (at least 7 days from now)
        daysToAdd = 7 + ((targetDay - currentDay + 7) % 7);
      } else {
        // Next occurrence of this weekday (could be today if it matches)
        daysToAdd = (targetDay - currentDay + 7) % 7;
        if (daysToAdd === 0 && targetDay !== currentDay) {
          daysToAdd = 7; // If it's the same day, go to next week
        }
      }
      
      const targetDate = new Date(today);
      targetDate.setDate(today.getDate() + daysToAdd);
      return targetDate.toISOString().slice(0, 10);
    }
  }
  
  // If no match found, return null
  return null;
}

// Test cases
const testCases = [
  'today',
  'i dag',
  'tomorrow',
  'i morgen',
  'mandag',
  'monday',
  'neste tirsdag',
  'next wednesday',
  'fredag',
  'invalid date'
];

console.log('Current date:', new Date().toISOString().slice(0, 10));
console.log('Current day:', ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][new Date().getDay()]);
console.log();

testCases.forEach(testCase => {
  const result = parseNaturalDate(testCase);
  console.log(`"${testCase}" → ${result || 'null'}`);
});

console.log('\n' + '='.repeat(50));
console.log('✅ Natural language parsing test completed!');

// Test example scenarios
console.log('\n📝 Example Chat Scenarios:');
console.log('User: "Edit my shift tomorrow"');
console.log('→ GPT calls editShift with date_reference="tomorrow"');
console.log('→ System finds shifts for tomorrow and allows editing');

console.log('\nUser: "Delete the Monday shift"');
console.log('→ GPT calls deleteShift with date_reference="Monday"');
console.log('→ System finds shifts for next Monday and allows deletion');

console.log('\nUser: "Edit my morning shift today"');
console.log('→ GPT calls editShift with date_reference="today", time_reference="morning"');
console.log('→ System finds morning shifts (before 12:00) for today');
