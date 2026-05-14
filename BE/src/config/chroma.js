const { ChromaClient } = require('chromadb');
const dotenv = require('dotenv');

dotenv.config();

const chromaClient = new ChromaClient({
  host: process.env.CHROMA_HOST || 'api.trychroma.com',
  tenant: process.env.CHROMA_TENANT || '8d7a382f-c41c-4ba6-9d7c-94e20ac0761e',
  database: process.env.CHROMA_DATABASE || 'RAG-TemanPulih',
  ssl: true,
  headers: {
    "x-chroma-token": process.env.CHROMA_API_KEY || ""
  }
});

// Helper for hybrid search config
const createHybridCollection = async (collectionName) => {
  return await chromaClient.getOrCreateCollection({
    name: collectionName,
    metadata: {
      "hnsw:space": "cosine",
      "dense_embedding_model": "chroma-cloud-qwen",
      "sparse_embedding_model": "chroma-cloud-splade"
    }
  });
};

module.exports = {
  chromaClient,
  createHybridCollection
};
