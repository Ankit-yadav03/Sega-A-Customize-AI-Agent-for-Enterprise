import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Message as MessageType, ChatMode, ChatSession, TTSConfig } from '../types';
import { Message } from './Message';
import { SideMenu } from './SideMenu';
import { geminiService } from '../services/geminiService';
import { SendIcon, SparklesIcon, MicIcon, PlusIcon, ImageIcon, ToolsIcon, CanvasIcon, DocumentIcon, CodeIcon, MenuIcon, ZapIcon, BrainCircuitIcon, SearchIcon, ChevronDownIcon, SunIcon, MoonIcon, SettingsIcon } from './icons';

interface SpeechRecognitionAlternative {
    transcript: string;
    confidence: number;
}
interface SpeechRecognitionResult {
    readonly [index: number]: SpeechRecognitionAlternative;
    readonly isFinal: boolean;
}
interface SpeechRecognitionResultList {
    readonly length: number;
    item(index: number): SpeechRecognitionResult;
    [index: number]: SpeechRecognitionResult;
}
interface SpeechRecognitionEvent extends Event {
    readonly results: SpeechRecognitionResultList;
}
interface SpeechRecognition extends EventTarget {
    continuous: boolean;
    interimResults: boolean;
    onresult: (event: SpeechRecognitionEvent) => void;
    start(): void;
    stop(): void;
}
declare global {
    interface Window {
        SpeechRecognition: new () => SpeechRecognition;
        webkitSpeechRecognition: new () => SpeechRecognition;
    }
}

const Modal: React.FC<{ title: string; icon: React.ReactNode; children: React.ReactNode; onClose: () => void; }> = ({ title, icon, children, onClose }) => (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={onClose}>
        <div className="bg-gray-50 dark:bg-gray-900/50 backdrop-blur-xl border border-gray-200 dark:border-white/10 rounded-2xl shadow-xl w-full max-w-lg" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-3">
                    {icon}
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">{title}</h3>
                </div>
                <button onClick={onClose} className="text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white text-2xl">&times;</button>
            </div>
            <div className="p-6 text-gray-900 dark:text-gray-100">{children}</div>
        </div>
    </div>
);

const ConfirmationModal: React.FC<{ title: string; children: React.ReactNode; onConfirm: () => void; onCancel: () => void; }> = ({ title, children, onConfirm, onCancel }) => (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
        <div className="bg-gray-50 dark:bg-gray-900/50 backdrop-blur-xl border border-gray-200 dark:border-white/10 rounded-2xl shadow-xl w-full max-w-sm">
            <div className="p-6">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">{title}</h3>
                <div className="text-gray-600 dark:text-gray-300 mb-6">{children}</div>
                <div className="flex justify-end gap-3">
                    <button onClick={onCancel} className="px-4 py-2 text-sm font-semibold text-gray-700 dark:text-gray-300 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 rounded-lg transition-colors">
                        No
                    </button>
                    <button onClick={onConfirm} className="px-4 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors">
                        Yes
                    </button>
                </div>
            </div>
        </div>
    </div>
);

const SettingsModal: React.FC<{ onClose: () => void; ttsConfig: TTSConfig; setTtsConfig: (config: TTSConfig) => void; }> = ({ onClose, ttsConfig, setTtsConfig }) => {
    const [browserVoices, setBrowserVoices] = useState<SpeechSynthesisVoice[]>([]);
    const geminiVoices = ['Kore', 'Puck', 'Charon', 'Fenrir', 'Zephyr'];

    useEffect(() => {
        const loadVoices = () => {
            const voices = window.speechSynthesis.getVoices();
            const googleUS = voices.filter(v => v.name.includes('Google US English'));
            if (googleUS.length > 0) {
                setBrowserVoices(googleUS);
                if (ttsConfig.engine === 'browser' && !googleUS.find(v => v.name === ttsConfig.voice)) {
                    setTtsConfig({ ...ttsConfig, voice: googleUS[0].name });
                }
            } else {
                const usVoices = voices.filter(v => v.lang === 'en-US');
                setBrowserVoices(usVoices);
            }
        };

        loadVoices();
        window.speechSynthesis.onvoiceschanged = loadVoices;
    }, []);

    const handleChangeEngine = (engine: 'browser' | 'gemini') => {
        const defaultVoice = engine === 'browser' ? (browserVoices[0]?.name || '') : 'Kore';
        setTtsConfig({ engine, voice: defaultVoice });
    };

    const handleChangeVoice = (e: React.ChangeEvent<HTMLSelectElement>) => {
        setTtsConfig({ ...ttsConfig, voice: e.target.value });
    };

    return (
        <Modal title="Settings" icon={<SettingsIcon className="w-6 h-6 text-indigo-500 dark:text-indigo-400" />} onClose={onClose}>
            <div className="space-y-6">
                <div>
                    <h4 className="text-sm font-bold uppercase text-gray-500 dark:text-gray-400 tracking-wider mb-3">Text-to-Speech Engine</h4>
                    <div className="grid grid-cols-2 gap-4">
                        <button
                            onClick={() => handleChangeEngine('browser')}
                            className={`p-3 rounded-xl border-2 text-sm font-medium transition-all ${ttsConfig.engine === 'browser' ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300' : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'}`}
                        >
                            Browser Native
                            <div className="text-xs font-normal opacity-70 mt-1">Fast, No Latency</div>
                        </button>
                        <button
                            onClick={() => handleChangeEngine('gemini')}
                            className={`p-3 rounded-xl border-2 text-sm font-medium transition-all ${ttsConfig.engine === 'gemini' ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300' : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'}`}
                        >
                            Gemini AI
                            <div className="text-xs font-normal opacity-70 mt-1">High Quality, Slower</div>
                        </button>
                    </div>
                </div>

                <div>
                    <h4 className="text-sm font-bold uppercase text-gray-500 dark:text-gray-400 tracking-wider mb-3">Voice Selection</h4>
                    <select
                        value={ttsConfig.voice}
                        onChange={handleChangeVoice}
                        className="w-full p-3 bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white"
                    >
                        {ttsConfig.engine === 'browser' ? (
                            browserVoices.length > 0 ? browserVoices.map(v => (
                                <option key={v.name} value={v.name}>{v.name}</option>
                            )) : <option disabled>No Google US English voices detected</option>
                        ) : (
                            geminiVoices.map(v => (
                                <option key={v} value={v}>{v}</option>
                            ))
                        )}
                    </select>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                        {ttsConfig.engine === 'browser'
                            ? "Showing Google US English voices for natural sounding playback."
                            : "Select a pre-built AI voice from Gemini."}
                    </p>
                </div>
            </div>
        </Modal>
    );
};

const AnimatedGreeting: React.FC = () => {
    const [mainText, setMainText] = useState('');
    const [subText, setSubText] = useState('');
    const fullMainText = "Hello!";
    const fullSubText = "I am Sega, your AI Assistant";

    useEffect(() => {
        setMainText('');
        setSubText('');

        const mainTimeout = setTimeout(() => {
            setMainText(fullMainText);

            const words = fullSubText.split(' ');
            let i = 0;
            const subTextInterval = setInterval(() => {
                if (i < words.length) {
                    setSubText(prev => words.slice(0, i + 1).join(' '));
                    i++;
                } else {
                    clearInterval(subTextInterval);
                }
            }, 150);

            return () => clearInterval(subTextInterval);
        }, 300);

        return () => clearTimeout(mainTimeout);
    }, []);

    return (
        <div className="flex-1 flex flex-col items-center justify-center text-center px-4">
            <h1 className="text-4xl md:text-5xl font-medium mb-2 transition-opacity duration-500">
                <span className={`bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-600 bg-clip-text text-transparent ${mainText ? 'opacity-100' : 'opacity-0'}`}>{mainText}</span>
            </h1>
            <p className="text-4xl md:text-5xl font-medium text-gray-600 dark:text-gray-300 min-h-[56px]">
                <span className="bg-gradient-to-r from-blue-600 to-indigo-500 dark:from-blue-400 dark:to-indigo-500 bg-clip-text text-transparent">{subText}</span>
            </p>
        </div>
    );
};

const modes = [
    { mode: ChatMode.FlashLite, label: "Flash", icon: <ZapIcon className="w-4 h-4" /> },
    { mode: ChatMode.Pro, label: "Pro", icon: <BrainCircuitIcon className="w-4 h-4" /> },
    { mode: ChatMode.Search, label: "Search", icon: <SearchIcon className="w-4 h-4" /> }
];

interface ChatViewProps {
    isDark: boolean;
    onToggleTheme: () => void;
}

export const ChatView: React.FC<ChatViewProps> = ({ isDark, onToggleTheme }) => {
    const [chatMode, setChatMode] = useState<ChatMode>(ChatMode.FlashLite);
    const [messages, setMessages] = useState<MessageType[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [attachment, setAttachment] = useState<{ name: string; content: string; type: 'image' | 'text' } | null>(null);
    const [suggestions, setSuggestions] = useState<string[]>([]);
    const [isListening, setIsListening] = useState(false);
    const [isPlusMenuOpen, setIsPlusMenuOpen] = useState(false);
    const [isToolsMenuOpen, setIsToolsMenuOpen] = useState(false);
    const [isImageGenOpen, setIsImageGenOpen] = useState(false);
    const [isTranscriptionOpen, setIsTranscriptionOpen] = useState(false);
    const [isCanvasOpen, setIsCanvasOpen] = useState(false);
    const [isSideMenuOpen, setIsSideMenuOpen] = useState(false);
    const [modeToSwitch, setModeToSwitch] = useState<ChatMode | null>(null);
    const [isModeMenuOpen, setIsModeMenuOpen] = useState(false);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [bgStyle, setBgStyle] = useState({});

    const [sessions, setSessions] = useState<ChatSession[]>([]);
    const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);

    const [ttsConfig, setTtsConfig] = useState<TTSConfig>({ engine: 'browser', voice: '' });

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const speechRecognitionRef = useRef<SpeechRecognition | null>(null);
    const textAreaRef = useRef<HTMLTextAreaElement>(null);
    const modeButtonRefs = useRef<(HTMLButtonElement | null)[]>([]);

    const hasStarted = messages.length > 0;
    const initialSuggestions = ["Plan a trip", "Write a poem", "Learn to code", "Summarize an article", "Draft an email", "Explain a concept"];

    const scrollToBottom = () => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); };

    useEffect(() => { scrollToBottom(); }, [messages, suggestions]);

    useEffect(() => {
        const saved = localStorage.getItem('sega_history');
        if (saved) {
            try {
                setSessions(JSON.parse(saved));
            } catch (e) { console.error("Failed to load history", e); }
        }
        const savedTTS = localStorage.getItem('sega_tts_config');
        if (savedTTS) {
            try {
                setTtsConfig(JSON.parse(savedTTS));
            } catch (e) { console.error("Failed to load TTS config", e); }
        }
    }, []);

    useEffect(() => {
        if (sessions.length > 0) {
            localStorage.setItem('sega_history', JSON.stringify(sessions));
        }
    }, [sessions]);

    useEffect(() => {
        localStorage.setItem('sega_tts_config', JSON.stringify(ttsConfig));
    }, [ttsConfig]);

    useEffect(() => {
        if (messages.length > 0) {
            const id = currentSessionId || Date.now().toString();
            if (!currentSessionId) setCurrentSessionId(id);

            setSessions(prev => {
                const existingSessionIndex = prev.findIndex(s => s.id === id);
                const firstUserMsg = messages.find(m => m.role === 'user');
                let title = "New Chat";
                if (firstUserMsg) {
                    title = firstUserMsg.text.substring(0, 40) + (firstUserMsg.text.length > 40 ? '...' : '');
                }

                const updatedSession: ChatSession = {
                    id,
                    title,
                    timestamp: Date.now(),
                    messages
                };

                if (existingSessionIndex !== -1) {
                    if (prev[existingSessionIndex].messages.length === messages.length &&
                        prev[existingSessionIndex].messages[messages.length - 1]?.text === messages[messages.length - 1]?.text) {
                        return prev;
                    }
                    const newSessions = [...prev];
                    newSessions[existingSessionIndex] = updatedSession;
                    return newSessions.sort((a, b) => b.timestamp - a.timestamp);
                } else {
                    return [updatedSession, ...prev];
                }
            });
        }
    }, [messages, currentSessionId]);


    const handleNewChat = useCallback(() => {
        setMessages([]);
        setInput('');
        setAttachment(null);
        setIsLoading(false);
        setSuggestions([]);
        setIsSideMenuOpen(false);
        setCurrentSessionId(null);
    }, []);

    const handleSelectSession = (session: ChatSession) => {
        setMessages(session.messages);
        setCurrentSessionId(session.id);
        setIsSideMenuOpen(false);
    };

    const handleDeleteSession = (id: string) => {
        setSessions(prev => {
            const updated = prev.filter(s => s.id !== id);
            if (updated.length === 0) localStorage.removeItem('sega_history');
            else localStorage.setItem('sega_history', JSON.stringify(updated));
            return updated;
        });
        if (currentSessionId === id) {
            handleNewChat();
        }
    };

    const handleSetChatMode = (mode: ChatMode) => {
        if (chatMode === mode) return;

        if (messages.length > 0) {
            setModeToSwitch(mode);
        } else {
            setChatMode(mode);
        }
    };

    const confirmModeSwitch = () => {
        if (modeToSwitch) {
            handleNewChat();
            setChatMode(modeToSwitch);
        }
        setModeToSwitch(null);
    };

    const cancelModeSwitch = () => {
        setModeToSwitch(null);
    };

    useEffect(() => {
        const activeModeIndex = modes.findIndex(m => m.mode === chatMode);
        const activeButton = modeButtonRefs.current[activeModeIndex];
        if (activeButton) {
            setBgStyle({
                width: `${activeButton.offsetWidth}px`,
                transform: `translateX(${activeButton.offsetLeft}px)`,
            });
        }
    }, [chatMode]);


    useEffect(() => {
        const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (SpeechRecognitionAPI) {
            const recognition: SpeechRecognition = new SpeechRecognitionAPI();
            recognition.continuous = true;
            recognition.interimResults = true;
            recognition.onresult = (event) => {
                const transcript = Array.from(event.results).map(result => result[0]).map(result => result.transcript).join('');
                setInput(transcript);
            };
            speechRecognitionRef.current = recognition;
        }
    }, []);

    useEffect(() => {
        if (textAreaRef.current) {
            textAreaRef.current.style.height = 'auto';
            const scrollHeight = textAreaRef.current.scrollHeight;
            textAreaRef.current.style.height = `${scrollHeight}px`;
        }
    }, [input]);

    const handleSendMessage = async (messageText = input) => {
        if ((!messageText.trim() && !attachment) || isLoading) return;

        let userText = messageText;
        let userImage: string | undefined = undefined;

        if (attachment) {
            if (attachment.type === 'image') {
                userImage = attachment.content;
            } else {
                userText = `Attached File: \`${attachment.name}\`\n\n---\n\n${attachment.content}\n\n---\n\n${messageText}`;
            }
        }

        const currentChatMode = attachment?.type === 'image' ? ChatMode.Vision : chatMode;
        const userMessage: MessageType = { id: Date.now().toString(), role: 'user', text: userText, image: userImage };
        const currentMessages = [...messages, userMessage];

        setIsPlusMenuOpen(false);
        setIsToolsMenuOpen(false);
        setMessages(currentMessages);
        setInput('');
        setAttachment(null);
        setIsLoading(true);
        setSuggestions([]);

        const modelResponseId = (Date.now() + 1).toString();
        const modelMessage: MessageType = { id: modelResponseId, role: 'model', text: '' };
        setMessages(prev => [...prev, modelMessage]);

        try {
            const history = currentMessages.slice(0, -1);
            const stream = geminiService.getChatResponse(history, userMessage, currentChatMode);

            let fullResponseText = '';
            for await (const chunk of stream) {
                fullResponseText += chunk.text;
                setMessages((prev) => prev.map((msg) => msg.id === modelResponseId ? { ...msg, text: fullResponseText, sources: chunk.sources } : msg));
            }

            const finalModelMessage = { ...modelMessage, text: fullResponseText };
            const finalHistory = [...currentMessages, finalModelMessage];
            geminiService.getSuggestedReplies(finalHistory).then(setSuggestions);

        } catch (error) {
            console.error('Error generating content:', error);
            setMessages((prev) => prev.map((msg) => msg.id === modelResponseId ? { ...msg, text: 'Sorry, I encountered an error. Please try again.' } : msg));
        } finally {
            setIsLoading(false);
        }
    };

    const handleSuggestionClick = (suggestion: string) => {
        setInput(suggestion);
        handleSendMessage(suggestion);
    };

    const handleToggleListening = () => {
        if (isListening) {
            speechRecognitionRef.current?.stop();
            setIsListening(false);
        } else {
            speechRecognitionRef.current?.start();
            setIsListening(true);
        }
    };

    const openFileDialog = (accept: string) => {
        if (fileInputRef.current) {
            fileInputRef.current.accept = accept;
            fileInputRef.current.click();
        }
    };

    const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            if (file.type.startsWith('image/')) {
                reader.onloadend = () => {
                    setAttachment({ name: file.name, content: reader.result as string, type: 'image' });
                };
                reader.readAsDataURL(file);
            } else {
                reader.onloadend = () => {
                    setAttachment({ name: file.name, content: reader.result as string, type: 'text' });
                };
                reader.readAsText(file);
            }
        }
        if (event.target) event.target.value = '';
    };

    const handleImageGenerated = (base64Image: string, prompt: string) => {
        const modelMessage: MessageType = {
            id: Date.now().toString(),
            role: 'model',
            text: `Here is the image I generated for: "${prompt}"`,
            generatedImage: `data:image/jpeg;base64,${base64Image}`
        };
        setMessages(prev => [...prev, modelMessage]);
    };

    const handleTranscriptionCompleted = (transcribedText: string) => {
        setInput(prev => prev + transcribedText);
    };

    const DesktopModeSelector = () => (
        <div className="relative flex items-center justify-center gap-1 bg-gray-200 dark:bg-gray-800/80 p-1 rounded-full">
            <div className="absolute left-0 top-1 bottom-1 rounded-full bg-white dark:bg-indigo-600 shadow-sm mode-selector-bg" style={bgStyle} />
            {modes.map(({ mode, label, icon }, index) => (
                <button
                    key={mode}
                    ref={el => { modeButtonRefs.current[index] = el; }}
                    onClick={() => handleSetChatMode(mode)}
                    disabled={attachment?.type === 'image'}
                    className={`relative z-10 flex items-center gap-2 px-3 py-1 text-sm font-semibold rounded-full transition-colors ${chatMode === mode ? 'text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'} disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                    {icon} {label}
                </button>
            ))}
        </div>
    );

    const MobileModeSelector = () => {
        const currentModeInfo = modes.find(m => m.mode === chatMode) || modes[0];
        return (
            <div className="relative">
                <button onClick={() => setIsModeMenuOpen(!isModeMenuOpen)} className="flex items-center gap-2 px-3 py-1.5 text-sm font-semibold rounded-full bg-gray-200 dark:bg-gray-800/80 text-gray-700 dark:text-gray-200">
                    {currentModeInfo.icon}
                    <span>{currentModeInfo.label}</span>
                    <ChevronDownIcon className={`w-4 h-4 transition-transform ${isModeMenuOpen ? 'rotate-180' : ''}`} />
                </button>
                {isModeMenuOpen && (
                    <div className="absolute top-full right-0 mt-2 w-40 bg-white dark:bg-black/30 backdrop-blur-xl border border-gray-200 dark:border-white/10 rounded-lg shadow-lg py-1 z-30">
                        {modes.map(({ mode, label, icon }) => (
                            <button
                                key={mode}
                                onClick={() => { handleSetChatMode(mode); setIsModeMenuOpen(false); }}
                                className={`flex items-center gap-3 w-full text-left px-4 py-2 text-sm ${chatMode === mode ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                            >
                                {icon} {label}
                            </button>
                        ))}
                    </div>
                )}
            </div>
        );
    };

    const renderInputArea = () => (
        <div className="w-full max-w-3xl mx-auto flex flex-col items-center">
            {!hasStarted && input.length === 0 && (
                <div className="w-full flex justify-start md:justify-center mb-4">
                    <div className="flex flex-col items-start md:flex-row md:flex-wrap md:justify-center gap-2 w-full max-w-xs md:max-w-none">
                        {initialSuggestions.map((s, i) => (
                            <button key={i} onClick={() => handleSuggestionClick(s)} className="px-4 py-2 text-xs md:text-sm bg-gray-200 dark:bg-gray-800 hover:bg-gray-300 dark:hover:bg-gray-700 rounded-full transition-colors border border-gray-300 dark:border-gray-700 text-left md:text-center text-gray-700 dark:text-gray-300">{s}</button>
                        ))}
                    </div>
                </div>
            )}
            <div className="relative w-full bg-white dark:bg-black/20 backdrop-blur-xl border border-gray-200 dark:border-white/10 rounded-2xl p-2 flex items-center gap-1 z-20 shadow-sm dark:shadow-none">
                <div className="relative">
                    <button onClick={() => setIsPlusMenuOpen(!isPlusMenuOpen)} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"><PlusIcon className="w-6 h-6 text-gray-500 dark:text-gray-400" /></button>
                    {isPlusMenuOpen && (
                        <div className="absolute bottom-full left-0 mb-2 w-56 bg-white dark:bg-black/30 backdrop-blur-xl border border-gray-200 dark:border-white/10 rounded-lg shadow-lg py-1">
                            <button onClick={() => { openFileDialog('image/*'); setIsPlusMenuOpen(false); }} className="flex items-center gap-3 w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300">
                                <ImageIcon className="w-5 h-5 text-gray-500 dark:text-gray-400" /> Add images
                            </button>
                            <button onClick={() => { openFileDialog('.txt,.md,.csv'); setIsPlusMenuOpen(false); }} className="flex items-center gap-3 w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300">
                                <DocumentIcon className="w-5 h-5 text-gray-500 dark:text-gray-400" /> Add document
                            </button>
                            <button onClick={() => { openFileDialog('.js,.py,.html,.css,.ts,.tsx'); setIsPlusMenuOpen(false); }} className="flex items-center gap-3 w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300">
                                <CodeIcon className="w-5 h-5 text-gray-500 dark:text-gray-400" /> Import code
                            </button>
                        </div>
                    )}
                </div>
                <input type="file" ref={fileInputRef} onChange={handleFileSelect} className="hidden" />
                <textarea ref={textAreaRef} value={input} onChange={(e) => { setInput(e.target.value); }} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(); } }} placeholder={attachment ? "Ask something about the attachment..." : "Type your message..."} className="flex-1 bg-transparent resize-none outline-none text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 max-h-48 text-base md:text-lg" rows={1} disabled={isLoading} />
                <button onClick={handleToggleListening} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"><MicIcon className={`w-6 h-6 ${isListening ? 'text-red-500 animate-pulse' : 'text-gray-500 dark:text-gray-400'}`} /></button>
                <div className="relative">
                    <button onClick={() => setIsToolsMenuOpen(!isToolsMenuOpen)} className="flex items-center p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors font-semibold text-gray-500 dark:text-gray-400 text-xs md:text-sm">
                        <ToolsIcon className="w-5 h-5 mr-1" />
                        <span className="hidden md:inline">Tools</span>
                    </button>
                    {isToolsMenuOpen && (
                        <div className="absolute bottom-full right-0 mb-2 w-56 bg-white dark:bg-black/30 backdrop-blur-xl border border-gray-200 dark:border-white/10 rounded-lg shadow-lg py-1">
                            <button onClick={() => { setIsImageGenOpen(true); setIsToolsMenuOpen(false); }} className="flex items-center gap-3 w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300">
                                <ImageIcon className="w-5 h-5 text-gray-500 dark:text-gray-400" /> Image Generation
                            </button>
                            <button onClick={() => { setIsTranscriptionOpen(true); setIsToolsMenuOpen(false); }} className="flex items-center gap-3 w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300">
                                <MicIcon className="w-5 h-5 text-gray-500 dark:text-gray-400" /> Live Transcribe
                            </button>
                            <button onClick={() => { setIsCanvasOpen(true); setIsToolsMenuOpen(false); }} className="flex items-center gap-3 w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300">
                                <CanvasIcon className="w-5 h-5 text-gray-500 dark:text-gray-400" /> Canvas Mode
                            </button>
                        </div>
                    )}
                </div>
                <button onClick={() => handleSendMessage()} disabled={isLoading || (!input.trim() && !attachment)} className="p-3 rounded-full bg-indigo-600 hover:bg-indigo-700 transition-colors disabled:bg-indigo-400 dark:disabled:bg-indigo-900 disabled:cursor-not-allowed"><SendIcon className="w-6 h-6 text-white" /></button>
            </div>
            {attachment && (
                <div className="mt-2 flex items-center gap-2 text-sm justify-center bg-gray-200 dark:bg-gray-800/80 px-3 py-1 rounded-full">
                    {attachment.type === 'image' ? (
                        <img src={attachment.content} alt="upload preview" className="w-8 h-8 rounded-md object-cover" />
                    ) : (
                        <DocumentIcon className="w-5 h-5 text-gray-500 dark:text-gray-400 flex-shrink-0" />
                    )}
                    <span className="text-gray-700 dark:text-gray-300 truncate max-w-[150px] md:max-w-xs">{attachment.name}</span>
                    <button onClick={() => { setAttachment(null); }} className="text-red-500 dark:text-red-400 hover:text-red-600 dark:hover:text-red-300 text-xs">[remove]</button>
                </div>
            )}
        </div>
    );

    return (
        <div className="relative flex h-full w-full">
            <SideMenu
                isOpen={isSideMenuOpen}
                onClose={() => setIsSideMenuOpen(false)}
                onNewChat={handleNewChat}
                sessions={sessions}
                currentSessionId={currentSessionId}
                onSelectSession={handleSelectSession}
                onDeleteSession={handleDeleteSession}
            />
            <div className="flex flex-col h-full w-full bg-transparent">
                <header className="absolute top-0 left-0 right-0 z-30 p-4 flex items-center justify-between bg-white/80 dark:bg-gray-900/50 backdrop-blur-md h-20 border-b border-gray-100 dark:border-transparent">
                    <div className="flex items-center gap-2 md:gap-4">
                        <button onClick={() => setIsSideMenuOpen(true)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full group relative">
                            <MenuIcon className="w-6 h-6 text-gray-700 dark:text-gray-300" />
                            <span className="absolute top-full mt-2 left-1/2 -translate-x-1/2 whitespace-nowrap bg-gray-800 text-white text-xs px-2 py-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">History &amp; New Chat</span>
                        </button>
                        <h1 className="text-lg md:text-xl font-bold"><span className="animate-rainbow-text bg-gradient-to-r from-fuchsia-500 via-red-500 to-amber-500 bg-clip-text text-transparent">Sega v2.2 Preview</span></h1>
                    </div>
                    <div className="hidden md:flex items-center gap-3">
                        <DesktopModeSelector />
                        <button onClick={() => setIsSettingsOpen(true)} className="p-2 rounded-full bg-gray-200 dark:bg-gray-800 hover:bg-gray-300 dark:hover:bg-gray-700 transition-colors text-gray-700 dark:text-gray-300">
                            <SettingsIcon className="w-5 h-5" />
                        </button>
                        <button onClick={onToggleTheme} className="p-2 rounded-full bg-gray-200 dark:bg-gray-800 hover:bg-gray-300 dark:hover:bg-gray-700 transition-colors text-gray-700 dark:text-gray-300">
                            {isDark ? <SunIcon className="w-5 h-5" /> : <MoonIcon className="w-5 h-5" />}
                        </button>
                    </div>
                    <div className="md:hidden flex items-center gap-2">
                        <MobileModeSelector />
                        <button onClick={() => setIsSettingsOpen(true)} className="p-2 rounded-full bg-gray-200 dark:bg-gray-800 hover:bg-gray-300 dark:hover:bg-gray-700 transition-colors text-gray-700 dark:text-gray-300">
                            <SettingsIcon className="w-5 h-5" />
                        </button>
                        <button onClick={onToggleTheme} className="p-2 rounded-full bg-gray-200 dark:bg-gray-800 hover:bg-gray-300 dark:hover:bg-gray-700 transition-colors text-gray-700 dark:text-gray-300">
                            {isDark ? <SunIcon className="w-5 h-5" /> : <MoonIcon className="w-5 h-5" />}
                        </button>
                    </div>
                </header>

                {!hasStarted ? <AnimatedGreeting /> : (
                    <div className="flex-1 flex flex-col overflow-y-auto p-4 md:p-6 pt-20 pb-4">
                        <div className="space-y-6 mt-auto">
                            {messages.map((msg) => <Message key={msg.id} message={msg} ttsConfig={ttsConfig} />)}
                            {isLoading && messages[messages.length - 1]?.role === 'model' && (
                                <div className="flex justify-start"><div className="flex items-center gap-3 bg-white dark:bg-gray-800 rounded-2xl p-4 max-w-2xl shadow-sm dark:shadow-none"><SparklesIcon className="w-6 h-6 text-indigo-500 dark:text-indigo-400 animate-pulse" /><div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full w-24 animate-pulse"></div></div></div>
                            )}
                            {suggestions.length > 0 && !isLoading && (
                                <div className="flex justify-start items-center gap-2 pl-16 flex-wrap max-w-2xl">
                                    {suggestions.map((s, i) => (
                                        <button key={i} onClick={() => handleSuggestionClick(s)} className="px-3 py-1.5 text-xs bg-white dark:bg-gray-700 border border-gray-200 dark:border-transparent hover:bg-gray-50 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-full transition-colors shadow-sm dark:shadow-none">{s}</button>
                                    ))}
                                </div>
                            )}
                            <div ref={messagesEndRef} />
                        </div>
                    </div>
                )}

                <div className={`p-4 md:p-6 w-full ${!hasStarted ? 'pb-10' : ''}`}>
                    {renderInputArea()}
                </div>

                {isImageGenOpen && <ImageGenModal onClose={() => setIsImageGenOpen(false)} onImageGenerated={handleImageGenerated} />}
                {isTranscriptionOpen && <TranscriptionModal onClose={() => setIsTranscriptionOpen(false)} onTranscriptionCompleted={handleTranscriptionCompleted} />}
                {isCanvasOpen && <CanvasModal onClose={() => setIsCanvasOpen(false)} />}
                {isSettingsOpen && <SettingsModal onClose={() => setIsSettingsOpen(false)} ttsConfig={ttsConfig} setTtsConfig={setTtsConfig} />}
                {modeToSwitch && (
                    <ConfirmationModal
                        title="Switch Model?"
                        onConfirm={confirmModeSwitch}
                        onCancel={cancelModeSwitch}
                    >
                        <p>Switching models will start a new chat. Do you want to continue?</p>
                    </ConfirmationModal>
                )}
            </div>
        </div>
    );
};

const ImageGenModal: React.FC<{ onClose: () => void; onImageGenerated: (img: string, prompt: string) => void; }> = ({ onClose, onImageGenerated }) => {
    const [prompt, setPrompt] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleGenerate = async () => {
        if (!prompt.trim()) return;
        setIsLoading(true);
        setError(null);
        try {
            const base64Image = await geminiService.generateImage(prompt);
            onImageGenerated(base64Image, prompt);
            onClose();
        } catch (e) {
            setError("Failed to generate image.");
            console.error(e);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Modal title="Image Generation" icon={<ImageIcon className="w-6 h-6 text-indigo-500 dark:text-indigo-400" />} onClose={onClose}>
            <p className="text-gray-600 dark:text-gray-400 mb-4">Describe the image you want to create.</p>
            <div className="flex items-center gap-2 p-2 bg-gray-100 dark:bg-gray-700 rounded-lg">
                <input type="text" value={prompt} onChange={e => setPrompt(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleGenerate()} placeholder="A futuristic cityscape..." className="w-full bg-transparent outline-none px-2 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400" disabled={isLoading} />
                <button onClick={handleGenerate} disabled={isLoading || !prompt.trim()} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 rounded-md font-semibold hover:bg-indigo-700 disabled:bg-indigo-400 dark:disabled:bg-indigo-900 text-white">
                    <SparklesIcon className="w-5 h-5" /> Generate
                </button>
            </div>
            {isLoading && <p className="text-center mt-4 text-gray-600 dark:text-gray-300">Generating...</p>}
            {error && <p className="text-red-500 dark:text-red-400 text-center mt-4">{error}</p>}
        </Modal>
    );
};


const TranscriptionModal: React.FC<{ onClose: () => void; onTranscriptionCompleted: (text: string) => void; }> = ({ onClose, onTranscriptionCompleted }) => {
    const [isRecording, setIsRecording] = useState(false);
    const [transcription, setTranscription] = useState('');
    const [error, setError] = useState<string | null>(null);

    const sessionRef = useRef<any>(null);
    const mediaStreamRef = useRef<MediaStream | null>(null);
    const audioContextRef = useRef<AudioContext | null>(null);
    const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);

    const stopRecording = useCallback(() => {
        if (sessionRef.current) {
            sessionRef.current.then((session: any) => session?.close());
            sessionRef.current = null;
        }
        if (mediaStreamRef.current) {
            mediaStreamRef.current.getTracks().forEach(track => track.stop());
            mediaStreamRef.current = null;
        }
        if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
            audioContextRef.current.close().catch(console.error);
            audioContextRef.current = null;
        }
        if (scriptProcessorRef.current) {
            scriptProcessorRef.current.disconnect();
            scriptProcessorRef.current = null;
        }
        setIsRecording(false);
    }, []);

    const startRecording = useCallback(async () => {
        setIsRecording(true);
        setError(null);
        setTranscription('');
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaStreamRef.current = stream;

            const context = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
            audioContextRef.current = context;

            const source = context.createMediaStreamSource(stream);
            const processor = context.createScriptProcessor(4096, 1, 1);
            scriptProcessorRef.current = processor;

            const sessionPromise = geminiService.connectLiveForTranscription(
                (text) => setTranscription(prev => prev + text),
                (err) => { console.error(err); setError("An error occurred during transcription."); stopRecording(); },
                () => { console.log("Live transcription session closed."); stopRecording(); }
            );
            sessionRef.current = sessionPromise;

            processor.onaudioprocess = (audioProcessingEvent) => {
                const inputData = audioProcessingEvent.inputBuffer.getChannelData(0);
                if (sessionRef.current) {
                    sessionRef.current.then((session: any) => {
                        if (session) {
                            session.sendRealtimeInput({ media: geminiService.createAudioBlob(inputData) });
                        }
                    }).catch((e: any) => console.error("Error sending audio data", e));
                }
            };
            source.connect(processor);
            processor.connect(context.destination);
        } catch (e) {
            setError("Could not start recording. Please ensure microphone access is granted.");
            console.error(e);
            setIsRecording(false);
        }
    }, [stopRecording]);

    const handleInsert = () => {
        onTranscriptionCompleted(transcription);
        onClose();
    };

    useEffect(() => {
        startRecording();
        return () => stopRecording();
    }, [startRecording, stopRecording]);

    return (
        <Modal title="Live Transcription" icon={<MicIcon className="w-6 h-6 text-indigo-500 dark:text-indigo-400" />} onClose={onClose}>
            <div className="h-48 bg-gray-100 dark:bg-gray-800 rounded-lg p-4 overflow-y-auto text-gray-800 dark:text-gray-200 mb-4 border border-gray-200 dark:border-gray-700">
                {transcription || (isRecording ? "Listening..." : "Starting...")}
            </div>
            {error && <p className="text-red-500 dark:text-red-400 mb-4">{error}</p>}
            <div className="flex items-center gap-2">
                <button onClick={isRecording ? stopRecording : startRecording} className={`w-full px-4 py-2 rounded-md font-semibold hover:bg-opacity-90 text-white ${isRecording ? 'bg-red-600 hover:bg-red-700' : 'bg-gray-600'}`}>
                    {isRecording ? 'Stop' : 'Start'}
                </button>
                <button onClick={handleInsert} disabled={!transcription.trim()} className="w-full px-4 py-2 bg-indigo-600 text-white rounded-md font-semibold hover:bg-indigo-700 disabled:opacity-50">Insert Text</button>
            </div>
        </Modal>
    );
};

const CanvasModal: React.FC<{ onClose: () => void; }> = ({ onClose }) => {
    return (
        <Modal title="Canvas Mode" icon={<CanvasIcon className="w-6 h-6 text-indigo-500 dark:text-indigo-400" />} onClose={onClose}>
            <p className="text-gray-600 dark:text-gray-400 mb-6 text-center">This interactive feature is coming soon!</p>
            <div className="flex justify-center">
                <button onClick={onClose} className="w-1/2 px-4 py-2 bg-indigo-600 text-white rounded-md font-semibold hover:bg-indigo-700">Got it</button>
            </div>
        </Modal>
    );
};
