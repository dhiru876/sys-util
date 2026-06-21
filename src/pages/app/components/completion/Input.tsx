import { Loader2, XIcon, ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
  Button,
  ScrollArea,
  Input as InputComponent,
  Markdown,
  Switch,
  CopyButton,
} from "@/components";
import { UseCompletionReturn } from "@/types";
import { MessageHistory } from "./MessageHistory";
import { TopicTags } from "@/pages/chats/components";
import { useEffect, useCallback, Dispatch, SetStateAction } from "react";

type InputProps = UseCompletionReturn & {
  isHidden: boolean;
  activeTopic?: string | null;
  onSelectTopic?: Dispatch<SetStateAction<string | null>>;
  submitWithTopic?: (text?: string) => void;
};

export const Input = ({
  isPopoverOpen,
  isLoading,
  reset,
  input,
  setInput,
  handleKeyPress,
  handlePaste,
  currentConversationId,
  conversationHistory,
  startNewConversation,
  messageHistoryOpen,
  setMessageHistoryOpen,
  error,
  response,
  cancel,
  scrollAreaRef,
  inputRef,
  isHidden,
  keepEngaged,
  setKeepEngaged,
  responseHistory,
  historyIndex,
  setHistoryIndex,
  activeTopic,
  onSelectTopic,
  submitWithTopic,
}: InputProps) => {
  // Determine what to display: historical entry or live response
  const displayedResponse =
    historyIndex >= 0 && responseHistory && historyIndex < responseHistory.length
      ? responseHistory[historyIndex]
      : response;

  const totalHistory = responseHistory?.length ?? 0;

  // Current position label
  const positionLabel =
    historyIndex >= 0
      ? `${historyIndex + 1} / ${totalHistory}`
      : totalHistory > 0
      ? `${totalHistory} / ${totalHistory} (current)`
      : "";

  // Navigate to previous response (Shift+A)
  const goToPrev = useCallback(() => {
    if (!responseHistory || responseHistory.length === 0) return;
    if (historyIndex === -1) {
      // currently on live, go to last in history
      setHistoryIndex(responseHistory.length - 1);
    } else if (historyIndex > 0) {
      setHistoryIndex(historyIndex - 1);
    }
  }, [responseHistory, historyIndex, setHistoryIndex]);

  // Navigate to current/latest response (Shift+S)
  const goToCurrent = useCallback(() => {
    setHistoryIndex(-1);
  }, [setHistoryIndex]);

  // Topic-aware key press: use submitWithTopic when a topic is active
  const handleTopicKeyPress = useCallback((e: React.KeyboardEvent) => {
    if (activeTopic && submitWithTopic && e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (!isLoading && input.trim()) {
        submitWithTopic(input);
      }
      return;
    }
    handleKeyPress(e);
  }, [activeTopic, submitWithTopic, handleKeyPress, isLoading, input]);

  // Keyboard shortcuts: Shift+A = prev, Shift+S = current
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isPopoverOpen) return;
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      )
        return;

      if (e.shiftKey && e.key === "A") {
        e.preventDefault();
        goToPrev();
      } else if (e.shiftKey && e.key === "S") {
        e.preventDefault();
        goToCurrent();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isPopoverOpen, goToPrev, goToCurrent]);

  return (
    <div className="relative flex-1">
      {/* Topic Tags — shown above the input field */}
      {onSelectTopic && (
        <div className="absolute bottom-full left-0 right-0 z-10 pb-1">
          <TopicTags
            activeTopic={activeTopic ?? null}
            onSelect={onSelectTopic}
            disabled={isLoading}
          />
        </div>
      )}
      <Popover
        open={isPopoverOpen}
        onOpenChange={(open) => {
          if (!open && !isLoading && !keepEngaged) {
            reset();
          }
        }}
      >
        <PopoverTrigger asChild className="!border-none !bg-transparent">
          <div className="relative select-none">
            <InputComponent
              ref={inputRef}
              placeholder="Ask me anything..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleTopicKeyPress}
              onPaste={handlePaste}
              disabled={isLoading || isHidden}
              className={`${
                currentConversationId && conversationHistory.length > 0
                  ? "pr-14"
                  : "pr-2"
              }`}
            />

            {/* Conversation thread indicator */}
            {currentConversationId &&
              conversationHistory.length > 0 &&
              !isLoading && (
                <div className="absolute select-none right-1 top-1/2 -translate-y-1/2 flex items-center gap-1">
                  <MessageHistory
                    conversationHistory={conversationHistory}
                    currentConversationId={currentConversationId}
                    onStartNewConversation={startNewConversation}
                    messageHistoryOpen={messageHistoryOpen}
                    setMessageHistoryOpen={setMessageHistoryOpen}
                  />
                </div>
              )}

            {/* Loading indicator */}
            {isLoading && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2 animate-pulse">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              </div>
            )}
          </div>
        </PopoverTrigger>

        {/* Response Panel */}
        <PopoverContent
          align="end"
          side="bottom"
          className="w-screen p-0 border shadow-lg overflow-hidden"
          sideOffset={8}
        >
          <div className="flex items-center justify-between px-4 py-2 border-b bg-muted/30">
            <div className="flex flex-row gap-1 items-center">
              <h3 className="font-semibold text-xs select-none">
                {keepEngaged
                  ? "Conversation Mode"
                  : historyIndex >= 0
                  ? "Past Response"
                  : "AI Response"}
              </h3>
              <div className="text-[10px] text-muted-foreground/70">
                (Shift+A = prev · Shift+S = current)
              </div>
            </div>
            <div className="flex items-center gap-2 select-none">
              {/* Response history navigation arrows */}
              {totalHistory > 0 && (
                <div className="flex items-center gap-1 mr-1">
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-6 w-6 cursor-pointer"
                    onClick={goToPrev}
                    title="Previous response (Shift+A)"
                    disabled={
                      historyIndex === 0 ||
                      (historyIndex === -1 && totalHistory === 0)
                    }
                  >
                    <ChevronLeftIcon className="h-3 w-3" />
                  </Button>
                  <span className="text-[10px] text-muted-foreground min-w-[60px] text-center">
                    {positionLabel}
                  </span>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-6 w-6 cursor-pointer"
                    onClick={goToCurrent}
                    title="Current response (Shift+S)"
                    disabled={historyIndex === -1}
                  >
                    <ChevronRightIcon className="h-3 w-3" />
                  </Button>
                </div>
              )}

              <div className="flex flex-row items-center gap-2 mr-2">
                <p className="text-[10px]">{`Toggle ${
                  keepEngaged ? "AI response" : "conversation mode"
                }`}</p>
                <span className="text-[10px] text-muted-foreground/60 bg-muted/30 px-1 py-0 rounded border border-input/50">
                  {navigator.platform.toLowerCase().includes("mac")
                    ? "⌘"
                    : "Ctrl"}{" "}
                  + K
                </span>
                <Switch
                  checked={keepEngaged}
                  onCheckedChange={(checked) => {
                    setKeepEngaged(checked);
                    setTimeout(() => {
                      inputRef?.current?.focus();
                    }, 100);
                  }}
                />
              </div>
              <CopyButton content={displayedResponse} />
              <Button
                size="icon"
                variant="ghost"
                onClick={() => {
                  if (isLoading) {
                    cancel();
                  } else if (keepEngaged) {
                    setKeepEngaged(false);
                    startNewConversation();
                  } else {
                    reset();
                  }
                }}
                className="cursor-pointer"
                title={
                  isLoading
                    ? "Cancel loading"
                    : keepEngaged
                    ? "Close and start new conversation"
                    : "Clear conversation"
                }
              >
                <XIcon />
              </Button>
            </div>
          </div>

          <ScrollArea ref={scrollAreaRef} className="h-[calc(100vh-7rem)]">
            <div className="p-4">
              {error && (
                <div className="mb-4 p-3 bg-destructive/10 border border-destructive/20 rounded text-sm text-destructive">
                  <strong>Error:</strong> {error}
                </div>
              )}
              {isLoading && (
                <div className="flex items-center gap-2 my-4 text-muted-foreground animate-pulse select-none">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm">Generating response...</span>
                </div>
              )}
              {displayedResponse && <Markdown>{displayedResponse}</Markdown>}

              {/* Conversation History */}
              {keepEngaged && conversationHistory.length > 1 && (
                <div className="space-y-3 pt-3">
                  {conversationHistory
                    .sort((a, b) => b?.timestamp - a?.timestamp)
                    .map((message, index) => {
                      if (!isLoading && index === 0) {
                        return null;
                      }
                      return (
                        <div
                          key={message.id}
                          className={`p-3 rounded-lg text-sm ${
                            message.role === "user"
                              ? "bg-primary/10 border-l-4 border-primary"
                              : "bg-muted/50"
                          }`}
                        >
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-xs font-medium text-muted-foreground uppercase">
                              {message.role === "user" ? "You" : "AI"}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {new Date(message.timestamp).toLocaleTimeString(
                                [],
                                {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                }
                              )}
                            </span>
                          </div>
                          <Markdown>{message.content}</Markdown>
                        </div>
                      );
                    })}
                </div>
              )}
            </div>
          </ScrollArea>
        </PopoverContent>
      </Popover>
    </div>
  );
};
