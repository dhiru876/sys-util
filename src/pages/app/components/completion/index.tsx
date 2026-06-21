import { useCompletion } from "@/hooks";
import { Screenshot } from "./Screenshot";
import { Files } from "./Files";
import { Audio } from "./Audio";
import { Input } from "./Input";
import { ScreenshotVoiceCapture } from "./ScreenshotVoiceCapture";
import { useState } from "react";

export const Completion = ({ isHidden }: { isHidden: boolean }) => {
  const completion = useCompletion();
  const [activeTopic, setActiveTopic] = useState<string | null>(null);

  const submitWithTopic = (text?: string) => {
    const raw = text || completion.input;
    if (!raw.trim()) return;
    if (activeTopic) {
      completion.submit(`[Topic: ${activeTopic}] ${raw}`);
    } else {
      completion.submit(text);
    }
  };

  return (
    <>
      <Audio {...completion} />
      <Input
        {...completion}
        isHidden={isHidden}
        activeTopic={activeTopic}
        onSelectTopic={setActiveTopic}
        submitWithTopic={submitWithTopic}
      />
      <Screenshot {...completion} />
      <Files {...completion} />
      {completion.isAwaitingVoiceForScreenshot && (
        <ScreenshotVoiceCapture onCaptured={completion.onScreenshotVoiceCaptured} />
      )}
    </>
  );
};
