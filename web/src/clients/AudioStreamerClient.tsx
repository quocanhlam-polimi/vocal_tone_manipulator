"use client";

import { Button } from "@/components/ui/button";
import { useEffect, useRef, useState } from "react";
import { Waveform } from "../components/Waveform";

interface AudioStreamerClientProps {
  filterType?: string | null;
  configurations?: { [key: string]: string };
}

enum StatusEnum {
  Disconnected = 1,
  Connecting,
  Streaming,
  Error,
}

const STATUS_MAPPINGS = {
  [StatusEnum.Disconnected]: "Disconnected",
  [StatusEnum.Connecting]: "Connecting",
  [StatusEnum.Streaming]: "Streaming",
  [StatusEnum.Error]: "Error",
};

export default function AudioStreamerClient({
  filterType,
  configurations,
}: AudioStreamerClientProps) {
  const [status, setStatus] = useState(StatusEnum.Disconnected);

  const audioContextRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const workletRef = useRef<AudioWorkletNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);

  const originalSamplesRef = useRef<Float32Array>(new Float32Array(2048));

  const processedSamplesRef = useRef<Float32Array>(new Float32Array(2048));

  useEffect(() => {
    const ws = wsRef.current;

    if (!ws || ws.readyState !== WebSocket.OPEN) {
      return;
    }

    if (!filterType) {
      return;
    }

    ws.send(
      JSON.stringify({
        type: "filter_config",
        config: {
          filterType,
          ...configurations,
        },
      }),
    );
  }, [filterType, configurations]);

  const start = async () => {
    try {
      setStatus(StatusEnum.Connecting);

      // 1. Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        },
      });

      streamRef.current = stream;

      // 2. Create audio context
      const audioContext = new AudioContext();
      audioContextRef.current = audioContext;

      await audioContext.audioWorklet.addModule("/pcm-processor.js");

      // 3. Create AudioWorklet
      const worklet = new AudioWorkletNode(audioContext, "pcm-processor", {
        numberOfInputs: 1,
        numberOfOutputs: 1,
        outputChannelCount: [1],
      });

      workletRef.current = worklet;

      // 4. Connect microphone to AudioWorklet
      const source = audioContext.createMediaStreamSource(stream);
      sourceRef.current = source;

      source.connect(worklet);
      worklet.connect(audioContext.destination);

      // 5. Establish WebSocket connection
      const ws = new WebSocket("ws://localhost:8000/ws/audio");
      ws.binaryType = "arraybuffer";
      wsRef.current = ws;

      ws.onopen = () => {
        // Tell Python the audio sample rate
        ws.send(
          JSON.stringify({
            type: "init",
            sampleRate: audioContext.sampleRate,
          }),
        );

        setStatus(StatusEnum.Streaming);
      };

      // 6. Send captured audio to Python
      worklet.port.onmessage = (event) => {
        const samples = event.data as Float32Array;

        originalSamplesRef.current = samples;

        if (ws.readyState === WebSocket.OPEN) {
          ws.send(event.data.buffer);
        }
      };

      // 7. Receive processed audio from Python
      ws.onmessage = (event) => {
        const samples = new Float32Array(event.data);

        processedSamplesRef.current = samples;

        // Transfer processed samples to AudioWorklet
        worklet.port.postMessage(samples, [samples.buffer]);
      };

      ws.onerror = () => {
        setStatus(StatusEnum.Error);
      };

      ws.onclose = () => {
        setStatus(StatusEnum.Disconnected);
      };
    } catch (error) {
      console.error(error);
      setStatus(StatusEnum.Error);
      stop();
    }
  };

  const stop = () => {
    wsRef.current?.close();
    wsRef.current = null;

    sourceRef.current?.disconnect();
    workletRef.current?.disconnect();

    streamRef.current?.getTracks().forEach((track) => track.stop());

    audioContextRef.current?.close();

    sourceRef.current = null;
    workletRef.current = null;
    streamRef.current = null;
    audioContextRef.current = null;

    setStatus(StatusEnum.Disconnected);
  };

  return (
    <div className="flex flex-col gap-4">
      <span>Status: {STATUS_MAPPINGS[status]}</span>

      <div className="flex flex-row gap-4">
        <Button onClick={start}>Start</Button>

        <Button onClick={stop}>Stop</Button>
      </div>

      <div className="space-y-6 w-2/3">
        <Waveform
          title="Original microphone input"
          color="#3b82f6"
          getSamples={() => originalSamplesRef.current}
        />

        <Waveform
          title="Processed audio from Python"
          color="#10b981"
          getSamples={() => processedSamplesRef.current}
        />
      </div>
    </div>
  );
}
