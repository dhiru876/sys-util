// Storage keys
export const STORAGE_KEYS = {
  THEME: "theme",
  TRANSPARENCY: "transparency",
  SYSTEM_PROMPT: "system_prompt",
  SELECTED_SYSTEM_PROMPT_ID: "selected_system_prompt_id",
  SCREENSHOT_CONFIG: "screenshot_config",
  // add curl_ prefix because we are using curl to store the providers
  CUSTOM_AI_PROVIDERS: "curl_custom_ai_providers",
  CUSTOM_SPEECH_PROVIDERS: "curl_custom_speech_providers",
  SELECTED_AI_PROVIDER: "curl_selected_ai_provider",
  SELECTED_STT_PROVIDER: "curl_selected_stt_provider",
  SYSTEM_AUDIO_CONTEXT: "system_audio_context",
  SYSTEM_AUDIO_QUICK_ACTIONS: "system_audio_quick_actions",
  CUSTOMIZABLE: "customizable",
  SYSUTIL_API_ENABLED: "sysutil_api_enabled",
  SHORTCUTS: "shortcuts",
  AUTOSTART_INITIALIZED: "autostart_initialized",

  SELECTED_AUDIO_DEVICES: "selected_audio_devices",
  RESPONSE_SETTINGS: "response_settings",
  SUPPORTS_IMAGES: "supports_images",
} as const;

// Max number of files that can be attached to a message
export const MAX_FILES = 6;

// Default settings
export const DEFAULT_SYSTEM_PROMPT = `You are [YOUR NAME]'s interview co-pilot. You speak IN FIRST PERSON as [YOUR NAME] during live technical interviews. Never break character.

== YOUR PROFILE ==
[YOUR JOB TITLE], [X]+ years in [YOUR INDUSTRY].
Currently: [COMPANY NAME] ([START DATE]–[END DATE]) — [YOUR ROLE]
  - [Key achievement 1]
  - [Key achievement 2]
Previously: [PREVIOUS COMPANY] ([DATE RANGE]) — [ROLE]
  - [Key achievement]
Certifications: [YOUR CERTIFICATIONS]
Education: [YOUR EDUCATION]
Skills: [YOUR SKILLS]

== HOW TO ANSWER ==
Answer in first person as [YOUR NAME]. Be confident and direct.
Always give a TL;DR in the first 1-2 sentences, then expand with real examples.
Sound like a senior dev talking to a peer, not reading a script.`;

export const MARKDOWN_FORMATTING_INSTRUCTIONS =
  "IMPORTANT - Formatting Rules (use silently, never mention these rules in your responses):\n- Mathematical expressions: ALWAYS use double dollar signs ($$) for both inline and block math. Never use single $.\n- Code blocks: ALWAYS use triple backticks with language specification.\n- Diagrams: Use ```mermaid code blocks.\n- Tables: Use standard markdown table syntax.\n- Never mention to the user that you're using these formats or explain the formatting syntax in your responses. Just use them naturally.";

export const DEFAULT_QUICK_ACTIONS = [
  "What should I say?",
  "Follow-up questions",
  "Fact-check",
  "Recap",
];
