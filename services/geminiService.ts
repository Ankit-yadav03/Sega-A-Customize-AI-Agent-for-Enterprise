import { GoogleGenAI, Modality, Chat, Blob, Type, Content } from '@google/genai';
import { Message, ChatMode } from '../types';
import { encode } from '../utils/audio';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const getChat = (model: ChatMode, history: Message[]): Chat => {
    const chatHistory = history.map(msg => ({
        role: msg.role,
        parts: [{ text: msg.text }]
    }));

    return ai.chats.create({
        model,
        history: chatHistory
    });
}

const getBase64FromDataUrl = (dataUrl: string) => dataUrl.substring(dataUrl.indexOf(',') + 1);
const getMimeTypeFromDataUrl = (dataUrl: string) => {
    const matches = dataUrl.match(/^data:(.+);base64,/);
    return matches?.[1] || 'image/jpeg';
}

const geminiService = {
  getChatResponse: async function* (
    history: Message[],
    message: Message,
    mode: ChatMode
  ): AsyncGenerator<{ text: string; sources?: { uri: string; title: string }[] }> {
    try {
        if (message.image) {
            const historyContents: Content[] = history.map(msg => ({
              role: msg.role,
              parts: [{ text: msg.text }]
            }));

            const messageParts: Content['parts'] = [{ text: message.text }];
            if (message.image) {
                messageParts.unshift({
                    inlineData: {
                        mimeType: getMimeTypeFromDataUrl(message.image),
                        data: getBase64FromDataUrl(message.image),
                    }
                });
            }

            const responseStream = await ai.models.generateContentStream({
                model: mode,
                contents: [...historyContents, { role: 'user', parts: messageParts }]
            });
            for await (const chunk of responseStream) {
                yield { text: chunk.text };
            }
            return;
        }

        if (mode === ChatMode.Search) {
             const response = await ai.models.generateContent({
                model: mode,
                contents: message.text,
                config: {
                    tools: [{googleSearch: {}}],
                },
             });
             const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
             const sources = groundingChunks
                ?.map((chunk: any) => chunk.web)
                .filter(Boolean)
                .map((web: any) => ({ uri: web.uri, title: web.title })) || [];

             yield { text: response.text, sources };
             return;
        }

        if (mode === ChatMode.Pro) {
            const historyContents: Content[] = history.map(msg => ({
              role: msg.role,
              parts: [{ text: msg.text }]
            }));
            
            const responseStream = await ai.models.generateContentStream({
                model: ChatMode.Pro,
                contents: [...historyContents, { role: 'user', parts: [{ text: message.text }] }],
                config: {
                    thinkingConfig: { thinkingBudget: 32768 }
                }
            });

            for await (const chunk of responseStream) {
                yield { text: chunk.text };
            }
            return;
        }
        
        const chat = getChat(mode, history);
        const result = await chat.sendMessageStream({ message: message.text });

        for await (const chunk of result) {
            yield { text: chunk.text };
        }

    } catch (error) {
        console.error("Error in getChatResponse: ", error);
        yield { text: "An error occurred while processing your request." };
    }
  },

  getSuggestedReplies: async (history: Message[]): Promise<string[]> => {
    if (history.length === 0 || history[history.length - 1].role !== 'model') {
        return [];
    }
    try {
        const conversationForPrompt = history
            .slice(-6) // Take last 6 messages for context
            .map(m => `${m.role}: ${m.text}`)
            .join('\n');
        
        const prompt = `Based on this conversation, provide 3 short, distinct, and relevant follow-up prompts for the user. The prompts should be things the user might ask next. Focus on the model's last response.\n\nConversation:\n${conversationForPrompt}\n\nReplies:`;

        const response = await ai.models.generateContent({
            model: ChatMode.FlashLite, // Fast model for this task
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        replies: {
                            type: Type.ARRAY,
                            items: { type: Type.STRING },
                            description: "A list of 3 suggested replies for the user."
                        },
                    },
                    required: ['replies'],
                },
                temperature: 0.7,
            },
        });
        
        const jsonStr = response.text.trim();
        const parsed = JSON.parse(jsonStr);
        return (parsed.replies || []).slice(0, 3); // Ensure only 3 are returned
    } catch (error) {
        console.error("Error getting suggested replies:", error);
        return [];
    }
  },

  generateImage: async (prompt: string): Promise<string> => {
    const response = await ai.models.generateImages({
        model: 'imagen-4.0-generate-001',
        prompt,
        config: {
            numberOfImages: 1,
            outputMimeType: 'image/jpeg',
            aspectRatio: '1:1',
        },
    });
    return response.generatedImages[0].image.imageBytes;
  },

  getTextToSpeech: async (text: string, voiceName: string = 'Kore'): Promise<string> => {
    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash-preview-tts",
            contents: [{ parts: [{ text }] }],
            config: {
                responseModalities: [Modality.AUDIO],
                speechConfig: {
                    voiceConfig: {
                        prebuiltVoiceConfig: { voiceName },
                    },
                },
            },
        });
        const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
        if (!base64Audio) {
            throw new Error("No audio data returned from API.");
        }
        return base64Audio;
    } catch (error) {
        console.error("Error generating text-to-speech:", error);
        throw error;
    }
  },

  connectLiveForTranscription: (
    onMessage: (text: string) => void,
    onError: (e: ErrorEvent) => void,
    onClose: (e: CloseEvent) => void,
  ) => {
    return ai.live.connect({
      model: 'gemini-2.5-flash-native-audio-preview-09-2025',
      callbacks: {
        onopen: () => console.log('Live connection opened.'),
        onmessage: (message) => {
          if (message.serverContent?.inputTranscription) {
            const text = message.serverContent.inputTranscription.text;
            if (text) onMessage(text);
          }
        },
        onerror: onError,
        onclose: onClose,
      },
      config: {
        responseModalities: [Modality.AUDIO],
        inputAudioTranscription: {},
      }
    });
  },
  
  createAudioBlob(data: Float32Array): Blob {
    const l = data.length;
    const int16 = new Int16Array(l);
    for (let i = 0; i < l; i++) {
        int16[i] = data[i] * 32768;
    }
    return {
        data: encode(new Uint8Array(int16.buffer)),
        mimeType: 'audio/pcm;rate=16000',
    };
  }
};

export { geminiService };