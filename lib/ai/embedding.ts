import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENAI_API_KEY!);

/**
 * Generate a 3072-dimensional embedding vector for the given text
 * using Gemini's gemini-embedding-001 model.
 *
 * These vectors are stored on CoreIssue documents and queried via
 * MongoDB Atlas $vectorSearch for k-NN grievance clustering.
 *
 * @param text - The text to embed (should be PII-filtered beforehand)
 * @returns A 3072-element float array representing the text's semantic position
 */
export async function embedText(text: string): Promise<number[]> {
    const model = genAI.getGenerativeModel({ model: 'gemini-embedding-001' });
    const result = await model.embedContent(text);
    return result.embedding.values;
}
