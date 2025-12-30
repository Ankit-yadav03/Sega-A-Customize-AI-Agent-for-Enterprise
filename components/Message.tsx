
import React, { useState, useEffect, useRef } from 'react';
import { Message as MessageType, TTSConfig } from '../types';
import { BotIcon, UserIcon, LinkIcon, PlayIcon, PauseIcon } from './icons';
import { geminiService } from '../services/geminiService';
import { decode, decodeAudioData } from '../utils/audio';


// A more robust markdown-to-HTML converter
const renderMarkdown = (text: string) => {
    // 1. Escape HTML to prevent injection
    let escapedText = text.replace(/</g, '&lt;').replace(/>/g, '&gt;');

    const codeBlocks: string[] = [];

    // 2. Extract code blocks first to protect their content and structure
    escapedText = escapedText.replace(/```(\w*)\n([\s\S]*?)\n```/g, (_match, lang, code) => {
        const languageClass = lang ? `language-${lang}` : '';
        const placeholder = `__CODE_BLOCK_${codeBlocks.length}__`;
        codeBlocks.push(`<pre><code class="${languageClass}">${code.trim()}</code></pre>`);
        return placeholder;
    });

    // 3. Process headers (lines starting with #)
    // This removes the '##' and makes the text bold and sized appropriately
    escapedText = escapedText.replace(/^(#{1,6})\s+(.*)$/gm, (_match, hashes, content) => {
        const level = hashes.length;
        // Map levels to tailwind classes. 
        // H1/H2 are larger, H3+ are bold but smaller to fit chat bubbles.
        const sizeClasses = [
            'text-xl',      // #
            'text-lg',      // ##
            'text-base',    // ###
            'text-sm',      // ####
            'text-sm',      // #####
            'text-xs'       // ######
        ];
        const sizeClass = sizeClasses[level - 1] || 'text-base';
        return `<h${level} class="font-bold ${sizeClass} mt-3 mb-1 text-gray-900 dark:text-gray-100">${content.trim()}</h${level}>`;
    });

    // 4. Process lists
    escapedText = escapedText.replace(/^\s*\n\*/gm, '<ul>\n*');
    escapedText = escapedText.replace(/^(\s*)\* (.*)/gm, '$1<li>$2</li>');
    escapedText = escapedText.replace(/<\/li>\n<ul>/g, '</li><ul>');
    escapedText = escapedText.replace(/<\/ul>\n(?!\s*<li>)/g, '</ul>\n');

    // 5. Process inline elements
    escapedText = escapedText
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') // Bold
        .replace(/\*(.*?)\*/g, '<em>$1</em>')             // Italic
        .replace(/`([^`]+)`/g, '<code class="inline-code">$1</code>'); // Inline code

    // 6. Restore code blocks
    escapedText = escapedText.replace(/__CODE_BLOCK_(\d+)__/g, (_match, index) => {
        return codeBlocks[parseInt(index)];
    });

    return <div className="prose dark:prose-invert prose-sm max-w-none leading-relaxed text-gray-800 dark:text-gray-200" dangerouslySetInnerHTML={{ __html: escapedText }} />;
};

const style = document.createElement('style');
style.textContent = `
  .prose pre { background-color: #f3f4f6; border: 1px solid #e5e7eb; border-radius: 0.5rem; padding: 1rem; font-size: 0.875rem; overflow-x: auto; }
  .dark .prose pre { background-color: #111827; border-color: #374151; }
  .prose code { color: #1f2937; }
  .dark .prose code { color: #e5e7eb; }
  .prose .inline-code { background-color: #e5e7eb; font-size: 0.85em; padding: 0.2em 0.4em; border-radius: 0.25rem; }
  .dark .prose .inline-code { background-color: #374151; }
  .prose ul { margin-left: 1.5rem; list-style-type: disc; }
`;
document.head.append(style);


export const Message: React.FC<{ message: MessageType; ttsConfig: TTSConfig }> = ({ message, ttsConfig }) => {
  const { role, text, image, generatedImage, sources } = message;
  const isUserModel = role === 'model';
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);
  
  // Refs for audio control
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<AudioBufferSourceNode | null>(null);

  useEffect(() => {
    // Cleanup speech synthesis and AudioContext on component unmount
    return () => {
        window.speechSynthesis.cancel();
        stopAudioContext();
    };
  }, []);

  const stopAudioContext = () => {
    if (sourceNodeRef.current) {
        try {
            sourceNodeRef.current.stop();
        } catch (e) {
            // Ignore error if already stopped
        }
        sourceNodeRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close();
        audioContextRef.current = null;
    }
    setIsSpeaking(false);
  };

  const handleTextToSpeech = async () => {
    // Stop any existing audio
    window.speechSynthesis.cancel();
    if (isSpeaking) {
        stopAudioContext();
        return;
    }

    // Clean text for TTS to remove markdown symbols that sound weird (like ## or **)
    const textToSpeak = text
        .replace(/(?:^|\n)#{1,6}\s/g, ' ') // Remove headers (e.g. ##)
        .replace(/\*\*/g, '')              // Remove bold markers
        .replace(/\*/g, '')                // Remove italic markers
        .replace(/`/g, '')                 // Remove code backticks
        .replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1') // Keep link text, remove URL
        .trim();

    if (ttsConfig.engine === 'gemini') {
        setIsBuffering(true);
        try {
            const base64Audio = await geminiService.getTextToSpeech(textToSpeak, ttsConfig.voice || 'Kore');
            
            // Create AudioContext
            const ctx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
            audioContextRef.current = ctx;

            // Decode PCM data
            const audioBytes = decode(base64Audio);
            const audioBuffer = await decodeAudioData(audioBytes, ctx, 24000, 1);

            // Play
            const source = ctx.createBufferSource();
            source.buffer = audioBuffer;
            source.connect(ctx.destination);
            sourceNodeRef.current = source;
            
            source.onended = () => {
                setIsSpeaking(false);
            };
            
            source.start();
            setIsSpeaking(true);
            setIsBuffering(false);

        } catch (error) {
            console.error("Gemini TTS Error:", error);
            setIsBuffering(false);
            setIsSpeaking(false);
        }
    } else {
        // Browser Native
        const synth = window.speechSynthesis;
        const utterance = new SpeechSynthesisUtterance(textToSpeak);
        
        if (ttsConfig.voice) {
            const voices = synth.getVoices();
            const selectedVoice = voices.find(v => v.name === ttsConfig.voice);
            if (selectedVoice) utterance.voice = selectedVoice;
        }

        utterance.onstart = () => setIsSpeaking(true);
        utterance.onend = () => setIsSpeaking(false);
        utterance.onerror = (e) => {
            console.error("Speech error:", e);
            setIsSpeaking(false);
        };

        synth.speak(utterance);
    }
  };

  const Icon = isUserModel ? BotIcon : UserIcon;

  return (
    <div className={`flex items-start gap-4 ${!isUserModel ? 'justify-end' : ''}`}>
      {!isUserModel && <div className="w-8 flex-shrink-0" />}
      <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${isUserModel ? 'bg-indigo-600' : 'bg-gray-300 dark:bg-gray-600'}`}>
        <Icon className={`w-5 h-5 ${isUserModel ? 'text-white' : 'text-gray-700 dark:text-white'}`} />
      </div>
      <div className={`flex flex-col gap-2 rounded-2xl p-4 max-w-2xl shadow-sm dark:shadow-none ${isUserModel ? 'bg-white dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700/50 rounded-tl-none' : 'bg-indigo-100 dark:bg-indigo-700/50 border border-indigo-200 dark:border-indigo-600/50 rounded-br-none text-gray-900 dark:text-white'}`}>
        {image && <img src={image} alt="user upload" className="max-w-xs rounded-lg mb-2" />}
        {text && renderMarkdown(text)}
        {generatedImage && <img src={generatedImage} alt="generated" className="max-w-xs rounded-lg mt-2" />}

        {(isUserModel && text) || (sources && sources.length > 0) ? (
            <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700/50 flex flex-col gap-3">
                {isUserModel && text && (
                    <div className="flex items-center gap-3 self-start">
                        <button onClick={handleTextToSpeech} disabled={!text.trim() || isBuffering} className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white disabled:opacity-50 transition-colors">
                            {isSpeaking ? <PauseIcon className="w-4 h-4"/> : <PlayIcon className="w-4 h-4" />}
                            <span>{isBuffering ? 'Loading...' : (isSpeaking ? 'Stop' : 'Listen')}</span>
                        </button>
                        {ttsConfig.engine === 'gemini' && (isBuffering || isSpeaking) && (
                            <span className="text-[10px] text-indigo-500 dark:text-indigo-400 animate-pulse font-medium">currently using Gemini AI voice</span>
                        )}
                    </div>
                )}
                {sources && sources.length > 0 && (
                    <div>
                        <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2 flex items-center gap-2">
                        <LinkIcon className="w-4 h-4" />
                        Sources
                        </h4>
                        <div className="flex flex-col gap-2">
                        {sources.map((source, index) => (
                            <a
                            key={index}
                            href={source.uri}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline truncate"
                            >
                            {index + 1}. {source.title}
                            </a>
                        ))}
                        </div>
                    </div>
                )}
            </div>
        ): null}
      </div>
       {isUserModel && <div className="w-8 flex-shrink-0" />}
    </div>
  );
};
