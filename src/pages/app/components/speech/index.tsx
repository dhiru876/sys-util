import { useState, useCallback, useEffect, useRef } from "react";
import {
  Button,
  Popover,
  PopoverTrigger,
  PopoverContent,
  ScrollArea,
} from "@/components";
import {
  HeadphonesIcon,
  AlertCircleIcon,
  LoaderIcon,
  AudioLinesIcon,
  CameraIcon,
  PlusIcon,
  XIcon,
  MicIcon,
} from "lucide-react";
import { invoke } from "@tauri-apps/api/core";
import { fetchSTT, shouldUseSysUtilAPI } from "@/lib/functions";
import { DEFAULT_SYSTEM_PROMPT } from "@/config";
import { ModeSwitcher } from "./ModeSwitcher";
import { RecordingPanel } from "./RecordingPanel";
import { ResultsSection } from "./ResultsSection";
import { SettingsPanel } from "./SettingsPanel";
import { PermissionFlow } from "./PermissionFlow";
import { QuickActions } from "./QuickActions";
import { Warning } from "./Warning";
import { TopicTags } from "@/pages/chats/components";
import { useSystemAudioType } from "@/hooks";
import { useApp } from "@/contexts";
import { cn } from "@/lib/utils";

const TOPIC_SYSTEM_PROMPTS: Record<string, string> = {
  Java: "You are a Java expert helping with technical interview practice. Answer only with accurate, well-known Java concepts. Do not guess or speculate about APIs or behavior you are not certain of. Stick strictly to Java (JDK, JVM, OOP, concurrency, collections, etc.).",
  SQL: "You are a SQL expert helping with technical interview practice. Answer only with accurate, verified SQL concepts. Do not hallucinate table names, functions, or syntax. Stick strictly to standard SQL and common databases (PostgreSQL, MySQL, Oracle, SQL Server).",
  Spring: "You are a Spring Framework expert helping with technical interview practice. Answer only with accurate Spring/Spring Boot concepts. Do not speculate about APIs or configurations you are not certain of. Stick strictly to Spring core, Spring Boot, Spring MVC, Spring Data, Spring Security.",
  AWS: "You are an AWS cloud expert helping with technical interview practice. Answer only with accurate, verified AWS concepts. Do not hallucinate service names, pricing, or behavior you are not certain of. Stick strictly to AWS core services (EC2, S3, ECS, EKS, Lambda, SNS, SQS, RDS, DynamoDB, CloudWatch, IAM, VPC, API Gateway, CloudFront, Route53, Elastic Load Balancing). When the question is scenario-based or multi-part: (1) first restate the scenario briefly to confirm understanding, (2) break your answer into clearly numbered sub-parts matching each part of the question, (3) for each sub-part give a direct answer first then expand. Draw from real AWS patterns — fault tolerance, high availability, cost optimisation, security best practices, and well-architected framework pillars.",
  NoSQL: "You are a NoSQL databases expert helping with technical interview practice. Answer only with accurate, verified concepts around MongoDB, Redis, Cassandra, DynamoDB, Couchbase, and NoSQL patterns (document, key-value, wide-column, graph). Do not hallucinate APIs, query syntax, or behavior you are not certain of.",
  DSA: "You are a Data Structures and Algorithms expert helping with technical interview practice. Answer only with accurate algorithm analysis, time/space complexity, and proven approaches. Do not guess or fabricate algorithm behavior.",
};

export const SystemAudio = (props: useSystemAudioType) => {
  const {
    capturing,
    isProcessing,
    isAIProcessing,
    lastTranscription,
    lastAIResponse,
    error,
    setupRequired,
    startCapture,
    stopCapture,
    isPopoverOpen,
    setIsPopoverOpen,
    useSystemPrompt,
    setUseSystemPrompt,
    contextContent,
    setContextContent,
    startNewConversation,
    conversation,
    resizeWindow,
    quickActions,
    addQuickAction,
    removeQuickAction,
    isManagingQuickActions,
    setIsManagingQuickActions,
    showQuickActions,
    setShowQuickActions,
    handleQuickActionClick,
    vadConfig,
    updateVadConfiguration,
    isRecordingInContinuousMode,
    recordingProgress,
    manualStopAndSend,
    startContinuousRecording,
    ignoreContinuousRecording,
    scrollAreaRef,
    screenshotImage,
    setScreenshotImage,
    processWithAI,
    setLastTranscription,
    setTopicPrompt,
  } = props;

  const { hasActiveLicense, supportsImages, selectedSttProvider, allSttProviders, systemPrompt } = useApp();

  // View mode toggle
  const [conversationMode, setConversationMode] = useState(false);

  // Topic selection for focused interview practice
  const [activeTopic, setActiveTopic] = useState<string | null>(null);

  const handleTopicSelect = useCallback((topic: string | null) => {
    setActiveTopic(topic);
    setTopicPrompt(topic ? TOPIC_SYSTEM_PROMPTS[topic] : null);
  }, [setTopicPrompt]);

  const [isCapturingScreenshot, setIsCapturingScreenshot] = useState(false);
  const [isMicRecording, setIsMicRecording] = useState(false);
  const [isMicTranscribing, setIsMicTranscribing] = useState(false);
  const micRecorderRef = useRef<MediaRecorder | null>(null);

  // Cleanup mic on unmount
  useEffect(() => {
    return () => { micRecorderRef.current?.stop(); };
  }, []);

  const handleToggleMicOverride = useCallback(async () => {
    // If already recording — stop, which triggers onstop → transcribe → send
    if (isMicRecording) {
      micRecorderRef.current?.stop();
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const chunks: Blob[] = [];
      const recorder = new MediaRecorder(stream);
      micRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };

      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        micRecorderRef.current = null;
        setIsMicRecording(false);
        if (chunks.length === 0) return;

        setIsMicTranscribing(true);
        try {
          const mimeType = recorder.mimeType || "audio/webm";
          const audioBlob = new Blob(chunks, { type: mimeType });
          const useSysUtilAPI = await shouldUseSysUtilAPI();
          const providerConfig = allSttProviders.find(
            (p) => p.id === selectedSttProvider.provider
          );
          if (!providerConfig && !useSysUtilAPI) return;

          const transcription = await fetchSTT({
            provider: useSysUtilAPI ? undefined : providerConfig,
            selectedProvider: selectedSttProvider,
            audio: audioBlob,
          });

          if (transcription?.trim()) {
            setLastTranscription(transcription.trim());
            const basePrompt = useSystemPrompt
              ? systemPrompt || DEFAULT_SYSTEM_PROMPT
              : contextContent || DEFAULT_SYSTEM_PROMPT;
            const topicPrompt = activeTopic ? TOPIC_SYSTEM_PROMPTS[activeTopic] : null;
            const effectivePrompt = topicPrompt
              ? `${topicPrompt}\n\n${basePrompt}`
              : basePrompt;
            const previousMessages = conversation.messages.map((msg) => ({
              role: msg.role,
              content: msg.content,
            }));
            await processWithAI(transcription.trim(), effectivePrompt, previousMessages);
          }
        } catch (err) {
          console.error("Mic override transcription failed:", err);
        } finally {
          setIsMicTranscribing(false);
        }
      };

      recorder.start();
      setIsMicRecording(true);
    } catch (err) {
      console.error("Failed to access mic for override:", err);
      setIsMicRecording(false);
    }
  }, [isMicRecording, processWithAI, selectedSttProvider, allSttProviders, useSystemPrompt, systemPrompt, contextContent, conversation.messages]);

  const isVadMode = vadConfig.enabled;
  const hasResponse = lastAIResponse || isAIProcessing;

  // Keyboard shortcut for Cmd+K to toggle view mode
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isPopoverOpen) return;

      // Cmd+K or Ctrl+K to toggle view mode
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setConversationMode((prev) => !prev);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isPopoverOpen]);

  const handleToggleCapture = async () => {
    if (capturing) {
      await stopCapture();
    } else {
      await startCapture();
    }
  };

  const handleModeChange = (vadEnabled: boolean) => {
    updateVadConfiguration({
      ...vadConfig,
      enabled: vadEnabled,
    });
  };

  // Capture screenshot functionality
  const handleCaptureScreenshot = useCallback(async () => {
    if (isCapturingScreenshot) return;

    setIsCapturingScreenshot(true);
    try {
      // Check screen recording permission on macOS
      const platform = navigator.platform.toLowerCase();
      if (platform.includes("mac")) {
        const {
          checkScreenRecordingPermission,
          requestScreenRecordingPermission,
        } = await import("tauri-plugin-macos-permissions-api");

        const hasPermission = await checkScreenRecordingPermission();
        if (!hasPermission) {
          await requestScreenRecordingPermission();
          setIsCapturingScreenshot(false);
          return;
        }
      }

      // Capture screenshot
      const base64: string = await invoke("capture_screenshot", {
        screenId: null, // Use default screen
      });

      setScreenshotImage(base64);
    } catch (err) {
      console.error("Failed to capture screenshot:", err);
    } finally {
      setIsCapturingScreenshot(false);
    }
  }, [isCapturingScreenshot]);

  const handleRemoveScreenshot = useCallback(() => {
    setScreenshotImage(null);
  }, []);

  const getButtonIcon = () => {
    if (setupRequired) return <AlertCircleIcon className="text-orange-500" />;
    if (error && !setupRequired)
      return <AlertCircleIcon className="text-red-500" />;
    if (isProcessing) return <LoaderIcon className="animate-spin" />;
    if (capturing)
      return <AudioLinesIcon className="text-green-500 animate-pulse" />;
    return <HeadphonesIcon />;
  };

  const getButtonTitle = () => {
    if (setupRequired) return "Setup required - Click for instructions";
    if (error && !setupRequired) return `Error: ${error}`;
    if (isProcessing) return "Transcribing audio...";
    if (capturing) return "Stop system audio capture";
    return "Start system audio capture";
  };

  return (
    <Popover
      open={isPopoverOpen}
      onOpenChange={(open) => {
        if (capturing && !open) {
          return;
        }
        setIsPopoverOpen(open);
      }}
    >
      <PopoverTrigger asChild>
        <Button
          size="icon"
          title={getButtonTitle()}
          onClick={handleToggleCapture}
          className={cn(
            capturing && "bg-green-50 hover:bg-green-100",
            error && "bg-red-100 hover:bg-red-200"
          )}
        >
          {getButtonIcon()}
        </Button>
      </PopoverTrigger>

      {(capturing || setupRequired || error) && (
        <PopoverContent
          align="end"
          side="bottom"
          className="select-none w-screen p-0 border shadow-lg overflow-hidden border-input/50"
          sideOffset={8}
        >
          <div className="flex flex-col h-[calc(100vh-4rem)] overflow-hidden">
            {/* Header - Mode Switcher + Actions */}
            <div className="flex-shrink-0 p-3 border-b border-border/50">
              <div className="flex items-center justify-between gap-2">
                {/* Mode Switcher */}
                {!setupRequired && (
                  <ModeSwitcher
                    isVadMode={isVadMode}
                    onModeChange={handleModeChange}
                    disabled={
                      isRecordingInContinuousMode ||
                      isProcessing ||
                      isAIProcessing
                    }
                  />
                )}
                {setupRequired && (
                  <h2 className="font-semibold text-sm">Setup Required</h2>
                )}

                {/* Action Buttons */}
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  {/* Settings / Help / Quick Actions icon buttons */}
                  {!setupRequired && <SettingsPanel
                    vadConfig={vadConfig}
                    onUpdateVadConfig={updateVadConfiguration}
                    useSystemPrompt={useSystemPrompt}
                    setUseSystemPrompt={setUseSystemPrompt}
                    contextContent={contextContent}
                    setContextContent={setContextContent}
                  />}
                  {!setupRequired && <Warning isVadMode={isVadMode} />}
                  {!setupRequired && hasResponse && <QuickActions
                    actions={quickActions}
                    onActionClick={handleQuickActionClick}
                    onAddAction={addQuickAction}
                    onRemoveAction={removeQuickAction}
                    isManaging={isManagingQuickActions}
                    setIsManaging={setIsManagingQuickActions}
                    show={showQuickActions}
                    setShow={setShowQuickActions}
                  />}

                  {/* Mic Override Button — repeat question in your own voice */}
                  {!setupRequired && (
                    <Button
                      size="sm"
                      variant={isMicRecording ? "default" : "outline"}
                      onClick={handleToggleMicOverride}
                      disabled={isMicTranscribing}
                      className={cn(
                        "h-6 text-[10px] gap-1 px-2",
                        isMicRecording && "bg-red-500 hover:bg-red-600 text-white border-red-500"
                      )}
                      title={isMicRecording ? "Stop & send your question" : "Speak your question (overrides interviewer)"}
                    >
                      {isMicTranscribing ? (
                        <LoaderIcon className="w-3 h-3 animate-spin" />
                      ) : (
                        <MicIcon className={cn("w-3 h-3", isMicRecording && "animate-pulse")} />
                      )}
                      {isMicTranscribing ? "Sending..." : isMicRecording ? "Stop" : "My voice"}
                    </Button>
                  )}

                  {/* Screenshot Button */}
                  {hasActiveLicense && !setupRequired && supportsImages && (
                    <Button
                      size="sm"
                      variant={screenshotImage ? "default" : "outline"}
                      onClick={handleCaptureScreenshot}
                      disabled={isCapturingScreenshot}
                      className={cn(
                        "h-6 text-[10px] gap-1 px-2",
                        screenshotImage && "bg-primary text-primary-foreground"
                      )}
                      title="Capture screenshot to include with transcription"
                    >
                      {isCapturingScreenshot ? (
                        <LoaderIcon className="w-3 h-3 animate-spin" />
                      ) : (
                        <CameraIcon className="w-3 h-3" />
                      )}
                      Screenshot
                    </Button>
                  )}

                  {/* New Conversation Button */}
                  {!setupRequired && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={startNewConversation}
                      className="h-6 text-[10px] gap-1 px-2"
                      title="Start a new conversation"
                    >
                      <PlusIcon className="w-3 h-3" />
                      New
                    </Button>
                  )}

                  {/* Close Button */}
                  {!capturing && (
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-6 w-6"
                      title="Close"
                      onClick={() => {
                        setIsPopoverOpen(false);
                        resizeWindow(false);
                      }}
                    >
                      <XIcon className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              </div>
            </div>

            {/* Topic Tags — only shown when not in setup/error state */}
            {!setupRequired && (
              <div className="flex-shrink-0 px-2 pt-2 border-b border-border/30 pb-1 space-y-1.5">
                <TopicTags
                  activeTopic={activeTopic}
                  onSelect={handleTopicSelect}
                  disabled={isRecordingInContinuousMode || isProcessing || isAIProcessing}
                  trailingContent={
                    <>
                      <button
                        onClick={() => handleQuickActionClick("Give me a concise introduction to my cloud/infrastructure experience for a technical interview — speak in first person. Cover: the cloud services I have used hands-on, my certifications, and one specific architecture decision I made and why. Keep it tight — 3-4 sentences max.")}
                        disabled={isRecordingInContinuousMode || isProcessing || isAIProcessing}
                        className={[
                          "inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium transition-all duration-150 select-none border focus:outline-none",
                          "bg-muted/50 text-muted-foreground border-border hover:bg-primary/10 hover:text-primary hover:border-primary/40",
                          (isRecordingInContinuousMode || isProcessing || isAIProcessing)
                            ? "opacity-40 cursor-not-allowed"
                            : "cursor-pointer",
                        ].join(" ")}
                        title="Get an AWS introduction"
                      >
                        ☁️ AWS-I
                      </button>
                      <button
                        onClick={() => handleQuickActionClick("Answer in first person. The interviewer just asked: 'What are the key differences between Java 8, 11, and 17, and which Java 17 features have you actually used?' Give a structured answer covering the evolution across versions and which features you have used in production. Be specific with real examples from your experience.")}
                        disabled={isRecordingInContinuousMode || isProcessing || isAIProcessing}
                        className={[
                          "inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium transition-all duration-150 select-none border focus:outline-none",
                          "bg-muted/50 text-muted-foreground border-border hover:bg-primary/10 hover:text-primary hover:border-primary/40",
                          (isRecordingInContinuousMode || isProcessing || isAIProcessing)
                            ? "opacity-40 cursor-not-allowed"
                            : "cursor-pointer",
                        ].join(" ")}
                        title="Java 8 vs 11 vs 17 differences + features you've used"
                      >
                        ☕ Java-Diff
                      </button>
                    </>
                  }
                />
              </div>
            )}

            <ScrollArea className="flex-1 min-h-0" ref={scrollAreaRef}>
              <div className="p-2 space-y-2">
                {/* Screenshot Preview */}
                {screenshotImage && (
                  <div className="flex items-center gap-2 p-2 rounded-lg bg-primary/5 border border-primary/20">
                    <img
                      src={`data:image/png;base64,${screenshotImage}`}
                      alt="Screenshot"
                      className="h-12 w-20 object-cover rounded"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] font-medium">
                        Screenshot attached
                      </p>
                      <p className="text-[9px] text-muted-foreground">
                        Will be sent with next transcription
                      </p>
                    </div>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-5 w-5"
                      onClick={handleRemoveScreenshot}
                    >
                      <XIcon className="h-3 w-3" />
                    </Button>
                  </div>
                )}

                {/* Error Display */}
                {error && !setupRequired && (
                  <div className="flex items-start gap-2 p-2.5 rounded-lg bg-red-50 border border-red-200">
                    <AlertCircleIcon className="w-3.5 h-3.5 text-red-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-[10px] font-medium text-red-800">
                        Error
                      </p>
                      <p className="text-[10px] text-red-700">{error}</p>
                    </div>
                  </div>
                )}

                {/* Setup Required - Permission Flow */}
                {setupRequired ? (
                  <PermissionFlow
                    onPermissionGranted={() => {
                      startCapture();
                    }}
                    onPermissionDenied={() => {
                      // Keep showing setup instructions
                    }}
                  />
                ) : (
                  <>
                    {/* Recording Panel */}
                    <RecordingPanel
                      isVadMode={isVadMode}
                      isRecording={isRecordingInContinuousMode}
                      isProcessing={isProcessing}
                      isAIProcessing={isAIProcessing}
                      recordingProgress={recordingProgress}
                      maxDuration={vadConfig.max_recording_duration_secs}
                      onStartRecording={startContinuousRecording}
                      onStopAndSend={manualStopAndSend}
                      onIgnore={ignoreContinuousRecording}
                    />

                    {/* AI Response */}
                    <ResultsSection
                      lastTranscription={lastTranscription}
                      lastAIResponse={lastAIResponse}
                      isAIProcessing={isAIProcessing}
                      conversation={conversation}
                      conversationMode={conversationMode}
                      setConversationMode={setConversationMode}
                    />

                  </>
                )}
              </div>
            </ScrollArea>

          </div>
        </PopoverContent>
      )}
    </Popover>
  );
};
