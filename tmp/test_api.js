async function test() {
  try {
    const res = await fetch('http://localhost:3000/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'hello' })
    });
    console.log('Status:', res.status);
    if (!res.body) {
      console.log('No body');
      return;
    }
    
    // In Node.js, res.body is a stream. ReadableStream in newer nodes might support getReader.
    // Let's try standard for await of
    for await (const chunk of res.body) {
      process.stdout.write(chunk.toString());
    }
    console.log('\nStream complete');
  } catch (e) {
    console.error('Error:', e);
  }
}
test();
