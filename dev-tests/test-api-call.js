import 'dotenv/config';

async function testChatAPI() {
  try {
    console.log('Testing chat API with "this week" query...');
    
    const response = await fetch('http://localhost:5173/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer fake-token' // This will trigger DEV_BYPASS
      },
      body: JSON.stringify({
        messages: [
          {
            role: 'user',
            content: 'Hvilke vakter jobber jeg denne uken?'
          }
        ],
        stream: false
      })
    });

    if (!response.ok) {
      console.error('API call failed:', response.status, response.statusText);
      const errorText = await response.text();
      console.error('Error response:', errorText);
      return;
    }

    const result = await response.json();
    console.log('API Response:', JSON.stringify(result, null, 2));

  } catch (error) {
    console.error('Error testing API:', error);
  }
}

testChatAPI();
