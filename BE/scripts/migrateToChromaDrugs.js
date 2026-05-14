const fs = require('fs');
const path = require('path');
const { chromaClient, createHybridCollection } = require('../src/config/chroma.js');

// Configuration
const CHUNK_SIZE = 1000;
const DATA_FILE_PATH = path.join(process.cwd(), '../pharmaceutical_rag_data2.json');
const COLLECTION_NAME = process.env.CHROMA_DATABASE_DRUGS || 'RAG-TemanPulih-Obat';

function chunkText(text, size = CHUNK_SIZE) {
  if (!text) return [];
  const lines = text.split('. ');
  const chunks = [];
  let currentChunk = '';

  for (const line of lines) {
    if (currentChunk.length + line.length > size) {
      if (currentChunk) chunks.push(currentChunk.trim());
      currentChunk = line + '. ';
    } else {
      currentChunk += line + '. ';
    }
  }
  if (currentChunk) chunks.push(currentChunk.trim());
  return chunks;
}

async function migrate() {
  try {
    console.log('Reading data file from:', DATA_FILE_PATH);
    if (!fs.existsSync(DATA_FILE_PATH)) {
      console.error('Data file not found!');
      process.exit(1);
    }
    const rawData = fs.readFileSync(DATA_FILE_PATH, 'utf-8');
    const data = JSON.parse(rawData);
    
    console.log(`Getting or creating collection: ${COLLECTION_NAME}`);
    const collection = await createHybridCollection(COLLECTION_NAME);
    
    let totalChunks = 0;
    
    console.log('Processing documents...');
    for (const item of data) {
      const chunks = chunkText(item.content, CHUNK_SIZE);
      const docs = [];
      const ids = [];
      const metas = [];

      for (let i = 0; i < chunks.length; i++) {
        docs.push(chunks[i]);
        ids.push(`${item.id}_chunk_${i}`);
        metas.push({
          source_id: item.id,
          chunk_index: i,
          nama_obat: item.metadata?.nama_obat || '',
          kategori: item.metadata?.kategori || ''
        });
      }

      if (docs.length > 0) {
        await collection.upsert({
          ids: ids,
          documents: docs,
          metadatas: metas
        });
        totalChunks += docs.length;
      }
    }

    console.log(`Migration completed successfully! Inserted ${totalChunks} chunks.`);
    
  } catch (error) {
    console.error('Migration failed:', error);
  }
}

migrate();
