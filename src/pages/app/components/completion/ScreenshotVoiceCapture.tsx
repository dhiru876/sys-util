import { useEffect, useRef } from "react";
import { useMicVAD } from "@ricky0123/vad-react";
import { fetchSTT } from "@/lib";
import { floatArrayToWav } from "@/lib/utils";
import { shouldUseSysUtilAPI } from "@/lib/functions/sysutil.api";
import { useApp } from "@/contexts";

interface ScreenshotVoiceCaptureProps {
  onCaptured: (voiceText?: string) => void;
}

const ScreenshotVoiceCaptureInternal = ({ onCaptured }: ScreenshotVoiceCaptureProps) => {
  const { selectedSttProvider, allSttProviders } = useApp();
  const resolvedRef = useRef(false);
  const onCapturedRef = useRef(onCaptured);
  useEffect(() => { onCapturedRef.current = onCaptured; }, [onCaptured]);

  const resolve = (voiceText?: string) => {
    if (resolvedRef.current) return;
    resolvedRef.current = true;
    onCapturedRef.current(voiceText);
  };

  useMicVAD({
    startOnLoad: true,
    userSpeakingThreshold: 0.6,
    onSpeechEnd: async (audio) => {
      try {
        const audioBlob = floatArrayToWav(audio, 16000, "wav");
        const useSysUtilAPI = await shouldUseSysUtilAPI();
        const providerConfig = allSttProviders.find(
          (p) => p.id === selectedSttProvider.provider
        );
        if (!providerConfig && !useSysUtilAPI) {
          resolve();
          return;
        }
        const transcription = await fetchSTT({
          provider: useSysUtilAPI ? undefined : providerConfig,
          selectedProvider: selectedSttProvider,
          audio: audioBlob,
        });
        resolve(transcription?.trim() || undefined);
      } catch {
        resolve();
      }
    },
  });

  // 15s fallback — if user never speaks, send screenshot with prompt only
  useEffect(() => {
    const timer = setTimeout(() => resolve(), 15000);
    return () => clearTimeout(timer);
  }, []);

  return null;
};

export const ScreenshotVoiceCapture = (props: ScreenshotVoiceCaptureProps) => (
  <ScreenshotVoiceCaptureInternal key="screenshot-vad" {...props} />
);
