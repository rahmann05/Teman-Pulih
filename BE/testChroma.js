const { ChromaClient } = require('chromadb');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });

async function testChroma() {
  const client = new ChromaClient({
    host: process.env.CHROMA_HOST || 'api.trychroma.com',
    tenant: process.env.CHROMA_TENANT,
    database: process.env.CHROMA_DATABASE,
    ssl: true,
    headers: {
      "x-chroma-token": process.env.CHROMA_API_KEY || ""
    }
  });

  try {
    console.log('Connecting to Chroma Cloud...');
    const collections = await client.listCollections();
    console.log('Successfully connected!');
    console.log('Collections found:', collections.map(c => c.name));
    
    for (const cName of collections.map(c => c.name)) {
        const col = await client.getCollection({ name: cName });
        const count = await col.count();
        console.log(`Collection "${cName}" has ${count} items.`);
    }

  } catch (error) {
    console.error('Failed to connect to Chroma:', error.message);
    if (error.response) {
        console.error('Response data:', error.response.data);
    }
  }
}

testChroma();
