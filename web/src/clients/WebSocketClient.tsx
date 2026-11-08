"use client";

import { useEffect, useRef, useState } from "react";

export default function WebSocketClient() {
  const ws = useRef<WebSocket | null>(null);

  const [status, setStatus] = useState("Disconnected");
  const [message, setMessage] = useState("");
  const [responses, setResponses] = useState<string[]>([]);

  useEffect(() => {
    const socket = new WebSocket(
      process.env.NEXT_PUBLIC_WS_URL ?? "ws://localhost:8000/ws",
    );

    ws.current = socket;

    socket.onopen = () => {
      setStatus("Connected");
    };

    socket.onmessage = (event) => {
      const data = JSON.parse(event.data);

      setResponses((prev) => [...prev, JSON.stringify(data)]);
    };

    socket.onerror = (error) => {
      console.error("WebSocket error:", error);
    };

    socket.onclose = () => {
      setStatus("Disconnected");
    };

    return () => {
      socket.close();
      ws.current = null;
    };
  }, []);

  const sendMessage = () => {
    if (ws.current?.readyState !== WebSocket.OPEN) {
      return;
    }

    ws.current.send(JSON.stringify({ message }));
  };

  return (
    <div>
      <p>Status: {status}</p>

      <input
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="Enter message"
      />

      <button onClick={sendMessage}>Send</button>

      <h3>Server responses</h3>

      {responses.map((response, index) => (
        <p key={index}>{response}</p>
      ))}
    </div>
  );
}
