import React, { useState, useRef, useEffect, useCallback } from 'react';
import { geminiService } from '../services/geminiService';
import { MicIcon, StopCircleIcon } from './icons';
// FIX: Removed import for LiveSession as it's not exported from @google/genai.

export const TranscriptionView: React.FC = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [transcription, setTranscription] = useState('');
  const [error, setError] = useState<string | null>(null);

  // FIX: Use `any` for the session promise ref since LiveSession is not an exported type.
  const sessionRef = useRef<any | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);

  const stopRecording = useCallback(() => {
    if (sessionRef.current) {
        sessionRef.current.then((session: any) => session.close());
        sessionRef.current = null;
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    if (scriptProcessorRef.current) {
        scriptProcessorRef.current.disconnect();
        scriptProcessorRef.current = null;
    }
    setIsRecording(false);
  }, []);
  
  const startRecording = async () => {
    setError(null);
    setTranscription('');
    setIsRecording(true);

    try {
      mediaStreamRef.current = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      const source = audioContextRef.current.createMediaStreamSource(mediaStreamRef.current);
      scriptProcessorRef.current = audioContextRef.current.createScriptProcessor(4096, 1, 1);
      
      sessionRef.current = geminiService.connectLiveForTranscription(
        (text) => {
          setTranscription(prev => prev + text);
        },
        (err) => {
          console.error("Live connection error:", err);
          setError("An error occurred during transcription.");
          stopRecording();
        },
        () => {
          console.log("Live connection closed.");
          stopRecording();
        }
      );
      
      scriptProcessorRef.current.onaudioprocess = (audioProcessingEvent) => {
        const inputData = audioProcessingEvent.inputBuffer.getChannelData(0);
        if (sessionRef.current) {
            sessionRef.current.then((session: any) => {
              session.sendRealtimeInput({ media: geminiService.createAudioBlob(inputData) });
            }).catch((e: any) => console.error("Error sending audio data", e));
        }
      };

      source.connect(scriptProcessorRef.current);
      scriptProcessorRef.current.connect(audioContextRef.current.destination);

    } catch (err) {
      console.error('Error starting recording:', err);
      setError('Could not start recording. Please ensure microphone access is granted.');
      setIsRecording(false);
    }
  };

  useEffect(() => {
    // Cleanup on component unmount
    return () => {
      stopRecording();
    };
  }, [stopRecording]);

  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-900 p-4 md:p-6 text-center">
      <header className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center justify-center gap-3">
          <MicIcon className="w-8 h-8 text-indigo-500 dark:text-indigo-400" />
          <span>Live Transcription</span>
        </h2>
        <p className="text-gray-600 dark:text-gray-400 mt-1">Speak into your microphone and see the live transcription below.</p>
      </header>

      <div className="flex-1 bg-gray-100 dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-2xl p-4 overflow-y-auto text-left">
        <p className="text-lg text-gray-800 dark:text-gray-200 whitespace-pre-wrap">{transcription || '...'}</p>
        {error && <p className="text-red-500 dark:text-red-400 mt-4">{error}</p>}
      </div>

      <div className="mt-6">
        {!isRecording ? (
          <button
            onClick={startRecording}
            className="flex items-center justify-center gap-3 px-8 py-4 bg-indigo-600 text-white rounded-full font-semibold hover:bg-indigo-700 transition-colors text-lg"
          >
            <MicIcon className="w-6 h-6" />
            Start Recording
          </button>
        ) : (
          <button
            onClick={stopRecording}
            className="flex items-center justify-center gap-3 px-8 py-4 bg-red-600 text-white rounded-full font-semibold hover:bg-red-700 transition-colors text-lg"
          >
            <StopCircleIcon className="w-6 h-6" />
            Stop Recording
          </button>
        )}
      </div>
    </div>
  );
};