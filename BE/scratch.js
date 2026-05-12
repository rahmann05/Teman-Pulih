const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config({ path: 'g:/Capstone/temanpulih/BE/.env' });

async function run() {
  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${process.env.GEMINI_API_KEY}`);
    const data = await response.json();
    console.log("Available models:", data.models.map(m => m.name));
  } catch (err) {
    console.error(err);
  }
}
run();
