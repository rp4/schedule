import { useState } from 'react';
import { Info, Shield, Database, Lock } from 'lucide-react';

interface SchedulerLandingPageProps {
  onUploadFile?: () => void;
  onLoadSample?: () => void;
}

export function SchedulerLandingPage({
  onUploadFile,
  onLoadSample
}: SchedulerLandingPageProps) {
  const [showPrivacyInfo, setShowPrivacyInfo] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files);
    if (files[0] && onUploadFile) {
      onUploadFile();
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  return (
    <div
      className="relative min-h-screen flex items-center justify-center"
      style={{
        backgroundImage: 'url(/Field.png)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat'
      }}
    >
      {/* Dark overlay for better text visibility */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />

      <div className="relative z-10 flex items-center justify-center min-h-[60vh] px-4">
        <div
          className={`w-full max-w-2xl p-12 border-2 border-dashed rounded-xl transition-all ${
            isDragging
              ? 'border-indigo-500 bg-indigo-500/10'
              : 'border-gray-300 bg-white/70 backdrop-blur-sm hover:border-indigo-400 shadow-lg'
          }`}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
        >
          <div className="text-center">
            {/* Title with icon */}
            <h2 className="text-5xl font-bold text-gray-800 mb-4 flex items-center justify-center gap-3">
              <span className="text-6xl">⚽</span>
              Team Scheduler
            </h2>

            {/* Subtitle with optional info button */}
            <div className="flex items-center justify-center gap-2 mb-6">
              <p className="text-xl text-gray-600">100% client-side processing - your data never leaves your browser</p>
              <div className="relative group">
                <Info
                  className="w-5 h-5 text-gray-400 cursor-help hover:text-gray-600 transition-colors"
                  onMouseEnter={() => setShowPrivacyInfo(true)}
                  onMouseLeave={() => setShowPrivacyInfo(false)}
                  aria-label="Privacy information"
                  role="button"
                  tabIndex={0}
                />
                {showPrivacyInfo && (
                  <div
                    className="fixed z-50 transition-all duration-200 ease-out transform-gpu"
                    style={{
                      left: '50%',
                      top: '50%',
                      transform: 'translate(-50%, -50%)',
                      maxWidth: 'min(90vw, 500px)',
                      width: '500px',
                      animation: 'fadeInScale 200ms ease-out'
                    }}
                  >
                    {/* Popup content */}
                    <div className="bg-gray-50 rounded-xl shadow-xl border border-gray-200 p-8">
                      {/* Header with icon */}
                      <div className="flex items-center gap-4 mb-8">
                        <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                          <Shield className="w-6 h-6 text-blue-600" />
                        </div>
                        <h3 className="text-2xl font-semibold text-gray-900">🔒 Your Data Stays Private</h3>
                      </div>

                      {/* Sections */}
                      <div className="flex items-start gap-4 mb-8">
                        <div className="w-10 h-10 bg-gray-200 rounded-lg flex items-center justify-center flex-shrink-0 mt-1">
                          <Database className="w-5 h-5 text-gray-600" />
                        </div>
                        <div>
                          <h4 className="text-lg font-semibold text-gray-900 mb-2">100% Local Processing</h4>
                          <p className="text-gray-600 leading-relaxed">
                            All data processing happens in your browser using Web Workers. Your Excel files and schedule data never leave your device.
                          </p>
                        </div>
                      </div>

                      <div className="flex items-start gap-4">
                        <div className="w-10 h-10 bg-gray-200 rounded-lg flex items-center justify-center flex-shrink-0 mt-1">
                          <Lock className="w-5 h-5 text-gray-600" />
                        </div>
                        <div>
                          <h4 className="text-lg font-semibold text-gray-900 mb-2">No Server Communication</h4>
                          <ul className="space-y-2 text-gray-600">
                            <li className="flex items-center gap-2">
                              <span className="text-gray-400">•</span>
                              <span>No data is sent to any server</span>
                            </li>
                            <li className="flex items-center gap-2">
                              <span className="text-gray-400">•</span>
                              <span>No tracking or analytics collected</span>
                            </li>
                            <li className="flex items-center gap-2">
                              <span className="text-gray-400">•</span>
                              <span>Works offline after initial load</span>
                            </li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Action buttons - flex-nowrap ensures they stay on same line */}
            <div className="flex items-center justify-center gap-4 flex-nowrap">
              <button
                onClick={onUploadFile}
                className="inline-flex items-center justify-center w-52 h-20 px-6 text-lg font-medium rounded-lg transition-all bg-indigo-500 text-white hover:bg-indigo-600 border-2 border-indigo-500"
              >
                Choose Excel File
              </button>
              <button
                onClick={onLoadSample}
                className="inline-flex items-center justify-center w-52 h-20 px-6 text-lg font-medium rounded-lg transition-all border-2 border-indigo-500 text-indigo-600 hover:bg-indigo-50"
              >
                Try Sample Data
              </button>
            </div>

            {/* Footer links */}
            <div className="flex items-center justify-center gap-6 mt-8">
              <a
                href="https://github.com/rp4/Scheduler"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-600 hover:text-gray-900 transition-all hover:scale-110"
                title="GitHub"
              >
                <svg className="w-10 h-10" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
                </svg>
              </a>
              <a
                href="https://chatgpt.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-600 hover:text-gray-900 transition-all hover:scale-110"
                title="ChatGPT"
              >
                <svg className="w-10 h-10" fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path d="M22.2819 9.8211a5.9847 5.9847 0 0 0-.5157-4.9108 6.0462 6.0462 0 0 0-6.5098-2.9A6.0651 6.0651 0 0 0 4.9807 4.1818a5.9847 5.9847 0 0 0-3.9977 2.9 6.0462 6.0462 0 0 0 .7427 7.0966 5.98 5.98 0 0 0 .511 4.9107 6.051 6.051 0 0 0 6.5146 2.9001A5.9847 5.9847 0 0 0 13.2599 24a6.0557 6.0557 0 0 0 5.7718-4.2058 5.9894 5.9894 0 0 0 3.9977-2.9001 6.0557 6.0557 0 0 0-.7475-7.0729zm-9.022 12.6081a4.4755 4.4755 0 0 1-2.8764-1.0408l.1419-.0804 4.7783-2.7582a.7948.7948 0 0 0 .3927-.6813v-6.7369l2.02 1.1686a.071.071 0 0 1 .038.052v5.5826a4.504 4.504 0 0 1-4.4945 4.4944zm-9.6607-4.1254a4.4708 4.4708 0 0 1-.5346-3.0137l.142.0852 4.783 2.7582a.7712.7712 0 0 0 .7806 0l5.8428-3.3685v2.3324a.0804.0804 0 0 1-.0332.0615L9.74 19.9502a4.4992 4.4992 0 0 1-6.1408-1.6464zM2.3408 7.8956a4.485 4.485 0 0 1 2.3655-1.9728V11.6a.7664.7664 0 0 0 .3879.6765l5.8144 3.3543-2.0201 1.1685a.0757.0757 0 0 1-.071 0l-4.8303-2.7865A4.504 4.504 0 0 1 2.3408 7.872zm16.5963 3.8558L13.1038 8.364 15.1192 7.2a.0757.0757 0 0 1 .071 0l4.8303 2.7913a4.4944 4.4944 0 0 1-.6765 8.1042v-5.6772a.79.79 0 0 0-.407-.667zm2.0107-3.0231l-.142-.0852-4.7735-2.7818a.7759.7759 0 0 0-.7854 0L9.409 9.2297V6.8974a.0662.0662 0 0 1 .0284-.0615l4.8303-2.7866a4.4992 4.4992 0 0 1 6.6802 4.66zM8.3065 12.863l-2.02-1.1638a.0804.0804 0 0 1-.038-.0567V6.0742a4.4992 4.4992 0 0 1 7.3757-3.4537l-.142.0805L8.704 5.459a.7948.7948 0 0 0-.3927.6813zm1.0976-2.3654l2.602-1.4998 2.6069 1.4998v2.9994l-2.5974 1.4997-2.6067-1.4997Z"/>
                </svg>
              </a>
              <a
                href="https://scoreboard.audittools.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-4xl hover:scale-110 transition-all"
                title="Scoreboard"
              >
                🏆
              </a>
              <a
                href="https://audittools.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-4xl hover:scale-110 transition-all"
                title="Audit Tools"
              >
                🧰
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}