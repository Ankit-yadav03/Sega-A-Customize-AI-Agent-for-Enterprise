
export enum AppMode {
  Chat = 'Chat',
  ImageGen = 'Image Generation',
  Transcription = 'Live Transcription',
}

export enum ChatMode {
  Flash = 'gemini-2.5-flash',
  FlashLite = 'gemini-flash-lite-latest',
  Pro = 'gemini-2.5-pro',
  Vision = 'gemini-2.5-flash',
  Search = 'gemini-2.5-flash',
}

export interface Message {
  id: string;
  role: 'user' | 'model';
  text: string;
  image?: string; // base64 image data for user messages
  generatedImage?: string; // base64 image data for model responses
  sources?: { uri: string; title: string }[]; // for search grounding
  audio?: string; // base64 audio data
}

export interface ChatSession {
    id: string;
    title: string;
    timestamp: number;
    messages: Message[];
}

export interface TTSConfig {
    engine: 'browser' | 'gemini';
    voice: string;
}