import { ChromaClient } from 'chromadb';
import 'dotenv/config';

export const chroma = new ChromaClient({
  path: `http://${process.env.CHROMA_HOST || 'localhost'}:${process.env.CHROMA_PORT || '8000'}`
});

export async function getCollection() {
  return chroma.getOrCreateCollection({
    name: process.env.CHROMA_COLLECTION || 'scenio_scenes',
  });
}
