import { GoogleGenAI } from '@google/genai';
const ai = new GoogleGenAI({ apiKey: 'test' });
ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: {
        parts: [
            { inlineData: { mimeType: 'image/jpeg', data: 'abc' } },
            { text: 'test' }
        ]
    }
});
