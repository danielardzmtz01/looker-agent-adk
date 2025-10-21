// src/App.tsx

import { useState, useRef, useCallback, useEffect } from "react";
import { v4 as uuidv4 } from 'uuid';
import { WelcomeScreen } from "@/components/WelcomeScreen";
import { ChatMessagesView } from "@/components/ChatMessagesView";

interface MessageWithAgent {
  type: "human" | "ai";
  content: string;
  id: string;
  agent?: string;
  lookerUrl?: string; // <-- Añade esta propiedad
}

export default function App() {
  const [userId, setUserId] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [appName, setAppName] = useState<string | null>(null);
  const [messages, setMessages] = useState<MessageWithAgent[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isBackendReady, setIsBackendReady] = useState(false);
  const [isCheckingBackend, setIsCheckingBackend] = useState(true);
  const currentAgentRef = useRef('');
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  const retryWithBackoff = async (
    fn: () => Promise<any>,
    maxRetries: number = 10,
    maxDuration: number = 120000 // 2 minutes
  ): Promise<any> => {
    const startTime = Date.now();
    let lastError: Error;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      if (Date.now() - startTime > maxDuration) {
        throw new Error(`Retry timeout after ${maxDuration}ms`);
      }

      try {
        return await fn();
      } catch (error) {
        lastError = error as Error;
        const delay = Math.min(1000 * Math.pow(2, attempt), 5000); // Exponential backoff, max 5s
        console.log(`Attempt ${attempt + 1} failed, retrying in ${delay}ms...`, error);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    throw lastError!;
  };

  const createSession = async (): Promise<{ userId: string, sessionId: string, appName: string }> => {
    const generatedSessionId = uuidv4();
    const response = await fetch(`/api/apps/app/users/u_999/sessions/${generatedSessionId}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to create session: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return {
      userId: data.userId,
      sessionId: data.id,
      appName: data.appName
    };
  };

  const checkBackendHealth = async (): Promise<boolean> => {
    try {
      const response = await fetch("/api/docs", {
        method: "GET",
        headers: {
          "Content-Type": "application/json"
        }
      });
      return response.ok;
    } catch (error) {
      console.log("Backend not ready yet:", error);
      return false;
    }
  };

  const processSseEventData = (jsonData: string, aiMessageId: string) => {
    try {
      const parsed = JSON.parse(jsonData);

      if (parsed.content && parsed.content.parts) {
        const textContent = parsed.content.parts
          .filter((part: any) => part.text)
          .map((part: any) => part.text)
          .join("");

        try {
          const jsonResponse = JSON.parse(textContent);
          if (jsonResponse.generate_looker_url_response?.looker_url) {
            const lookerUrl = jsonResponse.generate_looker_url_response.looker_url;
            // MODIFICADO: Formato de salida como Markdown
            const finalContent = `Here is your generated Looker URL: [${lookerUrl}](${lookerUrl})`;
            setMessages(prev => prev.map(msg =>
              msg.id === aiMessageId ? { ...msg, content: finalContent, agent: parsed.author, lookerUrl: lookerUrl } : msg
            ));
          } else {
            // Si el JSON es válido pero no una respuesta de URL de Looker, simplemente muestra el texto
            setMessages(prev => prev.map(msg =>
              msg.id === aiMessageId ? { ...msg, content: textContent, agent: parsed.author } : msg
            ));
          }
        } catch (e) {
          // Si aún no es un objeto JSON completo, añade el texto tal cual
          setMessages(prev => {
            const lastMessageIndex = prev.findIndex(msg => msg.id === aiMessageId);
            if (lastMessageIndex !== -1) {
              const updatedMessages = [...prev];
              const currentContent = updatedMessages[lastMessageIndex].content;
              updatedMessages[lastMessageIndex].content = currentContent + textContent;
              return updatedMessages;
            }
            return prev;
          });
        }
      }
    } catch (error) {
      console.error('Error parsing SSE data:', error);
    }
  };

  const handleSubmit = useCallback(async (query: string) => {
    if (!query.trim()) return;

    setIsLoading(true);
    try {
      let currentUserId = userId;
      let currentSessionId = sessionId;
      let currentAppName = appName;

      if (!currentSessionId || !currentUserId || !currentAppName) {
        const sessionData = await retryWithBackoff(createSession);
        currentUserId = sessionData.userId;
        currentSessionId = sessionData.sessionId;
        currentAppName = sessionData.appName;

        setUserId(currentUserId);
        setSessionId(currentSessionId);
        setAppName(currentAppName);
      }

      const userMessageId = Date.now().toString();
      setMessages(prev => [...prev, { type: "human", content: query, id: userMessageId }]);

      const aiMessageId = Date.now().toString() + "_ai";
      currentAgentRef.current = '';

      setMessages(prev => [...prev, {
        type: "ai",
        content: "Generando URL de Looker...",
        id: aiMessageId,
        agent: 'looker_url_agent',
      }]);

      const sendMessage = async () => {
        const response = await fetch("/api/run_sse", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            appName: currentAppName,
            userId: currentUserId,
            sessionId: currentSessionId,
            newMessage: {
              parts: [{ text: query }],
              role: "user"
            },
            streaming: true
          }),
        });

        if (!response.ok) {
          throw new Error(`Failed to send message: ${response.status} ${response.statusText}`);
        }
        return response;
      };

      const response = await retryWithBackoff(sendMessage);

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let lineBuffer = "";
      let eventDataBuffer = "";

      if (reader) {
        // eslint-disable-next-line no-constant-condition
        while (true) {
          const { done, value } = await reader.read();

          if (value) {
            lineBuffer += decoder.decode(value, { stream: true });
          }

          let eolIndex;
          while ((eolIndex = lineBuffer.indexOf('\n')) >= 0 || (done && lineBuffer.length > 0)) {
            let line: string;
            if (eolIndex >= 0) {
              line = lineBuffer.substring(0, eolIndex);
              lineBuffer = lineBuffer.substring(eolIndex + 1);
            } else {
              line = lineBuffer;
              lineBuffer = "";
            }

            if (line.trim() === "") {
              if (eventDataBuffer.length > 0) {
                const jsonDataToParse = eventDataBuffer.endsWith('\n') ? eventDataBuffer.slice(0, -1) : eventDataBuffer;
                processSseEventData(jsonDataToParse, aiMessageId);
                eventDataBuffer = "";
              }
            } else if (line.startsWith('data:')) {
              eventDataBuffer += line.substring(5).trimStart() + '\n';
            }
          }

          if (done) {
            if (eventDataBuffer.length > 0) {
              const jsonDataToParse = eventDataBuffer.endsWith('\n') ? eventDataBuffer.slice(0, -1) : eventDataBuffer;
              processSseEventData(jsonDataToParse, aiMessageId);
              eventDataBuffer = "";
            }
            break;
          }
        }
      }

      setIsLoading(false);

    } catch (error) {
      console.error("Error:", error);
      const aiMessageId = Date.now().toString() + "_ai_error";
      setMessages(prev => [...prev, {
        type: "ai",
        content: `Sorry, there was an error processing your request: ${error instanceof Error ? error.message : 'Unknown error'}`,
        id: aiMessageId
      }]);
      setIsLoading(false);
    }
  }, [userId, sessionId, appName, setMessages]);

  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollViewport = scrollAreaRef.current.querySelector(
        "[data-radix-scroll-area-viewport]"
      );
      if (scrollViewport) {
        scrollViewport.scrollTop = scrollViewport.scrollHeight;
      }
    }
  }, [messages]);

  useEffect(() => {
    const checkBackend = async () => {
      setIsCheckingBackend(true);
      const maxAttempts = 60;
      let attempts = 0;
      while (attempts < maxAttempts) {
        const isReady = await checkBackendHealth();
        if (isReady) {
          setIsBackendReady(true);
          setIsCheckingBackend(false);
          return;
        }
        attempts++;
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
      setIsCheckingBackend(false);
      console.error("Backend failed to start within 2 minutes");
    };
    checkBackend();
  }, []);

  const handleCancel = useCallback(() => {
    setMessages([]);
    window.location.reload();
  }, []);

  const BackendLoadingScreen = () => (
    <div className="flex-1 flex flex-col items-center justify-center p-4 overflow-hidden relative">
      <div className="w-full max-w-2xl z-10 bg-neutral-900/50 backdrop-blur-md p-8 rounded-2xl border border-neutral-700 shadow-2xl shadow-black/60">
        <div className="text-center space-y-6">
          <h1 className="text-4xl font-bold text-white flex items-center justify-center gap-3">
            ✨ Gemini FullStack - ADK 🚀
          </h1>
          <div className="flex flex-col items-center space-y-4">
            <div className="relative">
              <div className="w-16 h-16 border-4 border-neutral-600 border-t-blue-500 rounded-full animate-spin"></div>
              <div className="absolute inset-0 w-16 h-16 border-4 border-transparent border-r-purple-500 rounded-full animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }}></div>
            </div>
            <div className="space-y-2">
              <p className="text-xl text-neutral-300">
                Waiting for backend to be ready...
              </p>
              <p className="text-sm text-neutral-400">
                This may take a moment on first startup
              </p>
            </div>
            <div className="flex space-x-1">
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
              <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
              <div className="w-2 h-2 bg-pink-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-neutral-800 text-neutral-100 font-sans antialiased">
      <main className="flex-1 flex flex-col overflow-hidden w-full">
        <div className={`flex-1 overflow-y-auto ${(messages.length === 0 || isCheckingBackend) ? "flex" : ""}`}>
          {isCheckingBackend ? (
            <BackendLoadingScreen />
          ) : !isBackendReady ? (
            <div className="flex-1 flex flex-col items-center justify-center p-4">
              <div className="text-center space-y-4">
                <h2 className="text-2xl font-bold text-red-400">Backend Unavailable</h2>
                <p className="text-neutral-300">
                  Unable to connect to backend services at localhost:8000
                </p>
                <button
                  onClick={() => window.location.reload()}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
                >
                  Retry
                </button>
              </div>
            </div>
          ) : messages.length === 0 ? (
            <WelcomeScreen
              handleSubmit={handleSubmit}
              isLoading={isLoading}
              onCancel={handleCancel}
            />
          ) : (
            <ChatMessagesView
              messages={messages}
              isLoading={isLoading}
              scrollAreaRef={scrollAreaRef}
              onSubmit={handleSubmit}
              onCancel={handleCancel}
            />
          )}
        </div>
      </main>
    </div>
  );
}