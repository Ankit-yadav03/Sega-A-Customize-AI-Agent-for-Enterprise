import React, { useState } from 'react';
import { geminiService } from '../services/geminiService';
import { ImageIcon, SparklesIcon, DownloadIcon } from './icons';

export const ImageGenView: React.FC = () => {
  const [prompt, setPrompt] = useState('');
  const [image, setImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerateImage = async () => {
    if (!prompt.trim()) return;

    setIsLoading(true);
    setImage(null);
    setError(null);

    try {
      const base64Image = await geminiService.generateImage(prompt);
      setImage(`data:image/jpeg;base64,${base64Image}`);
    } catch (err) {
      console.error('Image generation failed:', err);
      setError('Failed to generate image. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-900 p-4 md:p-6">
      <header className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
          <ImageIcon className="w-8 h-8 text-indigo-500 dark:text-indigo-400" />
          <span>Image Generation</span>
        </h2>
        <p className="text-gray-600 dark:text-gray-400 mt-1">Create stunning visuals with Imagen. Describe what you want to see.</p>
      </header>

      <div className="flex-1 flex items-center justify-center">
        <div className="w-full max-w-2xl">
          <div className="aspect-square w-full bg-gray-100 dark:bg-gray-800 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-2xl flex items-center justify-center overflow-hidden">
            {isLoading && (
              <div className="text-center text-gray-500 dark:text-gray-400">
                <SparklesIcon className="w-12 h-12 mx-auto animate-pulse text-indigo-500 dark:text-indigo-400" />
                <p className="mt-2">Generating your masterpiece...</p>
              </div>
            )}
            {error && <p className="text-red-500 dark:text-red-400">{error}</p>}
            {!isLoading && image && (
              <img src={image} alt={prompt} className="w-full h-full object-contain" />
            )}
            {!isLoading && !image && !error && (
              <div className="text-center text-gray-400 dark:text-gray-500">
                <ImageIcon className="w-16 h-16 mx-auto" />
                <p>Your generated image will appear here</p>
              </div>
            )}
          </div>
          {image && !isLoading && (
            <a
              href={image}
              download={`sega-image-${Date.now()}.jpg`}
              className="mt-4 flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors w-full"
            >
              <DownloadIcon className="w-5 h-5" />
              Download Image
            </a>
          )}
        </div>
      </div>

      <div className="mt-6">
        <div className="max-w-2xl mx-auto flex items-center gap-3 p-2 bg-gray-100 dark:bg-gray-800 rounded-full">
          <input
            type="text"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleGenerateImage(); }}
            placeholder="e.g., A futuristic cityscape at sunset, cinematic lighting"
            className="w-full bg-transparent outline-none px-4 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400"
            disabled={isLoading}
          />
          <button
            onClick={handleGenerateImage}
            disabled={isLoading || !prompt.trim()}
            className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-full font-semibold hover:bg-indigo-700 transition-colors disabled:bg-indigo-400 dark:disabled:bg-indigo-900 disabled:cursor-not-allowed"
          >
            <SparklesIcon className="w-5 h-5" />
            Generate
          </button>
        </div>
      </div>
    </div>
  );
};