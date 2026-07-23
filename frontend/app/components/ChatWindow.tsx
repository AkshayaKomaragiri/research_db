"use client";

import { Search } from "lucide-react";
import React, {useEffect, useState, createContext, useContext} from "react";
export default function ChatWindow() {
 
  interface Message{
    id: string;
    role: "user" | "assistant";
    content: string;
  }
   const [prompt, setPrompt] = useState("");
  const [response, setResponse] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [message, setMessages] = useState<Message[]>([]);

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setPrompt(event.target.value);
  } 
  const  handleSubmit = async (event: React.SubmitEvent<HTMLFormElement>) =>{
    event.preventDefault();
    setSubmitted(true)
    const request = {
      "question" : prompt
    }
    const userMessageID = Date.now().toString();
    const assistantMessageID = (1+ Date.now()).toString();

    setMessages((prev) => [
      ...prev,
      {id: userMessageID, role: "user", content: prompt},
      {id: assistantMessageID, role: "assistant", content: ""},
    ])

    try{
      setLoading(true);
      const result = await fetch("http://127.0.0.1:8000/chat",{
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify(request)
      });
      if (!result.body) throw new Error('No body');
      const reader = result.body.getReader();
      const decoder = new TextDecoder("utf-8");

      while (true){
        const {value, done} = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, {stream: true});
       setMessages((prevMessages) =>
        prevMessages.map((msg) =>
        msg.id === assistantMessageID
       ? {...msg, content: msg.content + chunk}

       : msg
      )
    )
      }
   }
   catch(error){
      console.error("Error fetching stream", error);
   } finally{
    setLoading(false)
   }
    
  }

return (
    <main className="flex-1 overflow-y-auto p-10">
      <div className="mx-auto max-w-5xl space-y-8">
        
        {/* Messages List */}
        <div className="space-y-8">
          {message.map((msg) =>
            msg.role === "user" ? (
              /* User Bubble — Only appears after Enter is pressed */
              <div key={msg.id} className="flex justify-end">
                <div className="max-w-xl rounded-2xl bg-primary px-5 py-4 text-white">
                  {msg.content}
                </div>
              </div>
            ) : (
              /* AI Response Bubble — Appears and streams text live */
              (msg.content || loading) && (
                <div key={msg.id} className="flex">
                  <div className="max-w-3xl rounded-2xl border border-border bg-white px-6 py-5 shadow-sm">
                    <h3 className="mb-2 font-semibold">Answer</h3>
                    <p className="leading-8 text-muted whitespace-pre-wrap">
                      {msg.content || "Thinking..."}
                    </p>
                  </div>
                </div>
              )
            )
          )}
        </div>

        {/* Input Bar (Kept at bottom so user can send multiple requests) */}
        <div className="rounded-2xl border border-border bg-surface p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <Search className="text-primary" />
            <form onSubmit={handleSubmit} className="flex-1">
              <input
                placeholder="Ask a question about your research papers..."
                className="w-full bg-transparent text-lg outline-none placeholder:text-muted"
                value={prompt}
                onChange={handleChange}
                disabled={loading}
              />
            </form>
          </div>
        </div>

      </div>
    </main>
  );
}