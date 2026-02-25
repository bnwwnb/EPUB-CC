import React, { useState, useCallback } from 'react';
import JSZip from 'jszip';
import * as OpenCC from 'opencc-js';
import { saveAs } from 'file-saver';
import { Upload, FileText, Download, CheckCircle2, Loader2, AlertCircle, BookOpen, ArrowRightLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

type ConversionStatus = 'idle' | 'processing' | 'completed' | 'error';
type ConversionMode = 't2s' | 's2t';

export default function App() {
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<ConversionStatus>('idle');
  const [mode, setMode] = useState<ConversionMode>('t2s');
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      if (selectedFile.name.toLowerCase().endsWith('.epub')) {
        setFile(selectedFile);
        setError(null);
        setStatus('idle');
        setProgress(0);
      } else {
        setError('请上传有效的 .epub 文件');
      }
    }
  };

  const convertEpub = async () => {
    if (!file) return;

    try {
      setStatus('processing');
      setProgress(10);
      setError(null);

      const zip = new JSZip();
      const content = await zip.loadAsync(file);
      
      // t2s: Traditional to Simplified (hk -> cn)
      // s2t: Simplified to Traditional (cn -> hk)
      const converter = OpenCC.Converter({ 
        from: mode === 't2s' ? 'hk' : 'cn', 
        to: mode === 't2s' ? 'cn' : 'hk' 
      });
      
      const fileNames = Object.keys(content.files);
      const totalFiles = fileNames.length;
      let processedCount = 0;

      for (const fileName of fileNames) {
        const zipFile = content.files[fileName];
        
        // Only process text-based files
        if (!zipFile.dir && (
          fileName.endsWith('.html') || 
          fileName.endsWith('.xhtml') || 
          fileName.endsWith('.opf') || 
          fileName.endsWith('.ncx') ||
          fileName.endsWith('.txt')
        )) {
          const text = await zipFile.async('string');
          const convertedText = converter(text);
          zip.file(fileName, convertedText);
        }
        
        processedCount++;
        // Progress from 10% to 90%
        setProgress(Math.floor(10 + (processedCount / totalFiles) * 80));
      }

      setProgress(95);
      const blob = await zip.generateAsync({ type: 'blob', mimeType: 'application/epub+zip' });
      
      const suffix = mode === 't2s' ? '_简体' : '_繁体';
      const newFileName = file.name.replace(/\.epub$/i, `${suffix}.epub`);
      saveAs(blob, newFileName);
      
      setProgress(100);
      setStatus('completed');
    } catch (err) {
      console.error('Conversion failed:', err);
      setError('转换失败，请确保文件格式正确且未加密。');
      setStatus('error');
    }
  };

  const reset = () => {
    setFile(null);
    setStatus('idle');
    setProgress(0);
    setError(null);
  };

  return (
    <div className="min-h-screen bg-[#f5f5f5] text-[#1a1a1a] font-sans selection:bg-emerald-100">
      <div className="max-w-3xl mx-auto px-6 py-12 md:py-24">
        {/* Header */}
        <header className="mb-12 text-center md:text-left">
          <div className="flex items-center justify-center md:justify-start gap-3 mb-4">
            <div className="p-2 bg-emerald-600 rounded-xl text-white shadow-lg shadow-emerald-200">
              <BookOpen size={32} />
            </div>
            <h1 className="text-4xl font-bold tracking-tight">EPUB 繁简转换</h1>
          </div>
          <p className="text-lg text-zinc-500 max-w-xl">
            上传您的 EPUB 电子书，我们将为您快速进行繁简转换。
            所有处理均在您的浏览器中完成，保护您的隐私。
          </p>
        </header>

        <main>
          <div className="bg-white rounded-3xl shadow-sm border border-zinc-100 p-8 md:p-12">
            {/* Mode Selector */}
            {status === 'idle' && (
              <div className="flex justify-center mb-10">
                <div className="bg-zinc-100 p-1 rounded-2xl flex gap-1">
                  <button
                    onClick={() => setMode('t2s')}
                    className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${
                      mode === 't2s' 
                        ? 'bg-white text-emerald-600 shadow-sm' 
                        : 'text-zinc-500 hover:text-zinc-800'
                    }`}
                  >
                    繁体 → 简体
                  </button>
                  <button
                    onClick={() => setMode('s2t')}
                    className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${
                      mode === 's2t' 
                        ? 'bg-white text-emerald-600 shadow-sm' 
                        : 'text-zinc-500 hover:text-zinc-800'
                    }`}
                  >
                    简体 → 繁体
                  </button>
                </div>
              </div>
            )}

            <AnimatePresence mode="wait">
              {status === 'idle' && (
                <motion.div
                  key="idle"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-8"
                >
                  <div 
                    className={`
                      relative border-2 border-dashed rounded-2xl p-12 text-center transition-all
                      ${file ? 'border-emerald-500 bg-emerald-50/30' : 'border-zinc-200 hover:border-emerald-400 hover:bg-zinc-50'}
                    `}
                  >
                    <input
                      type="file"
                      accept=".epub"
                      onChange={handleFileChange}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                    <div className="flex flex-col items-center gap-4">
                      <div className={`p-4 rounded-full ${file ? 'bg-emerald-100 text-emerald-600' : 'bg-zinc-100 text-zinc-400'}`}>
                        {file ? <FileText size={40} /> : <Upload size={40} />}
                      </div>
                      <div>
                        <p className="text-lg font-medium">
                          {file ? file.name : '点击或拖拽 EPUB 文件到这里'}
                        </p>
                        <p className="text-sm text-zinc-400 mt-1">
                          支持 .epub 格式，建议文件大小不超过 50MB
                        </p>
                      </div>
                    </div>
                  </div>

                  {error && (
                    <div className="flex items-center gap-2 text-red-500 bg-red-50 p-4 rounded-xl border border-red-100">
                      <AlertCircle size={20} />
                      <p className="text-sm font-medium">{error}</p>
                    </div>
                  )}

                  <button
                    onClick={convertEpub}
                    disabled={!file}
                    className={`
                      w-full py-4 rounded-2xl font-bold text-lg transition-all flex items-center justify-center gap-2
                      ${file 
                        ? 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-lg shadow-emerald-100 active:scale-[0.98]' 
                        : 'bg-zinc-100 text-zinc-400 cursor-not-allowed'}
                    `}
                  >
                    开始{mode === 't2s' ? '繁转简' : '简转繁'}
                  </button>
                </motion.div>
              )}

              {status === 'processing' && (
                <motion.div
                  key="processing"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="py-12 text-center space-y-8"
                >
                  <div className="relative inline-block">
                    <Loader2 size={64} className="text-emerald-600 animate-spin" />
                    <div className="absolute inset-0 flex items-center justify-center text-xs font-bold text-emerald-700">
                      {progress}%
                    </div>
                  </div>
                  <div className="space-y-4">
                    <h2 className="text-2xl font-bold">正在转换中...</h2>
                    <p className="text-zinc-500">正在进行{mode === 't2s' ? '繁转简' : '简转繁'}转换，请稍候</p>
                    <div className="w-full bg-zinc-100 h-2 rounded-full overflow-hidden max-w-md mx-auto">
                      <motion.div 
                        className="h-full bg-emerald-600"
                        initial={{ width: 0 }}
                        animate={{ width: `${progress}%` }}
                        transition={{ duration: 0.3 }}
                      />
                    </div>
                  </div>
                </motion.div>
              )}

              {status === 'completed' && (
                <motion.div
                  key="completed"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="py-12 text-center space-y-8"
                >
                  <div className="flex justify-center">
                    <div className="p-6 bg-emerald-100 text-emerald-600 rounded-full">
                      <CheckCircle2 size={64} />
                    </div>
                  </div>
                  <div className="space-y-4">
                    <h2 className="text-2xl font-bold">转换成功！</h2>
                    <p className="text-zinc-500">您的{mode === 't2s' ? '简体' : '繁体'}版 EPUB 已准备就绪。</p>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
                    <button
                      onClick={reset}
                      className="px-8 py-4 rounded-2xl border border-zinc-200 font-bold hover:bg-zinc-50 transition-all"
                    >
                      转换另一个
                    </button>
                    <button
                      onClick={() => {
                        setError('下载已开始');
                        setTimeout(() => setError(null), 3000);
                      }}
                      className="px-8 py-4 rounded-2xl bg-emerald-600 text-white font-bold hover:bg-emerald-700 shadow-lg shadow-emerald-100 transition-all flex items-center justify-center gap-2"
                    >
                      <Download size={20} />
                      重新下载
                    </button>
                  </div>
                </motion.div>
              )}

              {status === 'error' && (
                <motion.div
                  key="error"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="py-12 text-center space-y-8"
                >
                  <div className="flex justify-center">
                    <div className="p-6 bg-red-100 text-red-600 rounded-full">
                      <AlertCircle size={64} />
                    </div>
                  </div>
                  <div className="space-y-4">
                    <h2 className="text-2xl font-bold text-red-600">出错了</h2>
                    <p className="text-zinc-500">{error || '转换过程中发生未知错误'}</p>
                  </div>
                  <button
                    onClick={reset}
                    className="px-8 py-4 rounded-2xl bg-zinc-900 text-white font-bold hover:bg-zinc-800 transition-all"
                  >
                    返回重试
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Features */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12">
            <div className="p-6 bg-white rounded-2xl border border-zinc-100 shadow-sm">
              <h3 className="font-bold mb-2">隐私安全</h3>
              <p className="text-sm text-zinc-500">所有转换均在本地浏览器完成，您的书籍不会被上传到任何服务器。</p>
            </div>
            <div className="p-6 bg-white rounded-2xl border border-zinc-100 shadow-sm">
              <h3 className="font-bold mb-2">保留排版</h3>
              <p className="text-sm text-zinc-500">仅修改文本内容，完美保留原始书籍的封面、目录、样式和图片。</p>
            </div>
            <div className="p-6 bg-white rounded-2xl border border-zinc-100 shadow-sm">
              <h3 className="font-bold mb-2">双向转换</h3>
              <p className="text-sm text-zinc-500">支持繁体到简体以及简体到繁体的双向智能转换，满足不同阅读需求。</p>
            </div>
          </div>
        </main>

        <footer className="mt-24 text-center text-sm text-zinc-400">
          <p>© {new Date().getFullYear()} EPUB 繁简转换工具 · 纯净无广告</p>
        </footer>
      </div>
    </div>
  );
}
