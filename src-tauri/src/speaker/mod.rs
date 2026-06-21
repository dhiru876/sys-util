use anyhow::Result;
use futures_util::Stream;
use serde::{Deserialize, Serialize};
use std::pin::Pin;

mod macos;
use macos::{SpeakerInput as PlatformSpeakerInput, SpeakerStream as PlatformSpeakerStream};

mod commands;

// Re-export commands for tauri handler
pub use commands::*;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AudioDevice {
    pub id: String,
    pub name: String,
    pub is_default: bool,
}

pub(crate) fn list_input_devices() -> Result<Vec<AudioDevice>> {
    return macos::get_input_devices();
}

pub(crate) fn list_output_devices() -> Result<Vec<AudioDevice>> {
    return macos::get_output_devices();
}

// SysUtil speaker input and stream
pub struct SpeakerInput {
    inner: PlatformSpeakerInput,
}

impl SpeakerInput {
    // Creates a new speaker input.
    pub fn new() -> Result<Self> {
        let inner = PlatformSpeakerInput::new(None)?;
        Ok(Self { inner })
    }

    // Creates a new speaker input with a specific device ID
    pub fn new_with_device(device_id: Option<String>) -> Result<Self> {
        let inner = PlatformSpeakerInput::new(device_id)?;
        Ok(Self { inner })
    }

    // Starts the audio stream.
    pub fn stream(self) -> SpeakerStream {
        let inner = self.inner.stream();
        SpeakerStream { inner }
    }
}

// Stream of f32 audio samples from the speaker.
pub struct SpeakerStream {
    inner: PlatformSpeakerStream,
}

impl Stream for SpeakerStream {
    type Item = f32;

    fn poll_next(
        mut self: std::pin::Pin<&mut Self>,
        cx: &mut std::task::Context<'_>,
    ) -> std::task::Poll<Option<Self::Item>> {
        Pin::new(&mut self.inner).poll_next(cx)
    }
}

impl SpeakerStream {
    // Gets the sample rate 
    pub fn sample_rate(&self) -> u32 {
        return self.inner.sample_rate();
    }
}
