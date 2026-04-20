const axios = require('axios');

async function testAvailability() {
  const profileId = 'some-uuid-here'; // I need a real profile ID
  const date = '2026-04-20';
  const url = `https://sua-secretaria.netlify.app/api/calendar/availability?profileId=${profileId}&date=${date}`;
  
  console.log(`Testing: ${url}`);
  try {
    const res = await axios.get(url);
    console.log('Response:', res.data);
  } catch (err) {
    console.error('Error:', err.message);
  }
}

// testAvailability();
