// netlify/functions/chat.js
exports.handler = async (event, context) => {
  // Set CORS headers for all responses
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };

  // Handle CORS preflight OPTIONS request
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers,
      body: ''
    };
  }

  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: {
        ...headers,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const { messages, systemPrompt } = JSON.parse(event.body);
    
    // Your API key is stored in Netlify environment variables
    const apiKey = process.env.GEMINI_API_KEY;
    
    // Check if API key exists
    if (!apiKey) {
      console.error('GEMINI_API_KEY not set');
      throw new Error('API key not configured');
    }
    
    const MODEL_NAME = 'gemini-1.5-flash-002';
    
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_NAME}:generateContent?key=${apiKey}`;
    
    const payload = {
      contents: messages,
      systemInstruction: {
        parts: [{ text: systemPrompt }]
      }
    };

    console.log('Calling Gemini API...');
    console.log('API URL:', apiUrl.substring(0, 80) + '...');
    console.log('Payload:', JSON.stringify(payload).substring(0, 200) + '...');
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 25000); // 25 second timeout
    
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Google API error:', response.status, errorText);
      throw new Error(`API error: ${response.status}`); // FIXED: Template literal syntax
    }

    const data = await response.json();
    console.log('API call successful');

    return {
      statusCode: 200,
      headers: {
        ...headers,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    };

  } catch (error) {
    console.error('Function error:', error.message);
    console.error('Error stack:', error.stack);
    return {
      statusCode: 500,
      headers: {
        ...headers,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        error: 'Internal server error',
        message: error.message,
        type: error.name
      })
    };
  }
};
