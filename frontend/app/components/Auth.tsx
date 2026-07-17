"use client";

import { useState } from 'react';
import { supabase } from '@/lib/src/supabase';

export default function AuthComponent({ onAuthSuccess }: { onAuthSuccess: () => void }) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  async function handleAuth(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      if (isSignUp) {
        // Handle Sign Up
        const { data, error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        
        // Check if user needs to confirm email or is instantly logged in
        if (data.session) {
          onAuthSuccess();
        } else {
          setMessage({ text: "Success! Check your email for a confirmation link.", type: 'success' });
        }
      } else {
        // Handle Sign In
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        onAuthSuccess();
      }
    } catch (err: any) {
      setMessage({ text: err.message || "An error occurred.", type: 'error' });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-md rounded-2xl border p-8 bg-white shadow-sm mt-10">
      <h2 className="text-2xl font-bold text-center mb-6">
        {isSignUp ? "Create an Account" : "Welcome Back"}
      </h2>

      <form onSubmit={handleAuth} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
          <input
            type="email"
            required
            className="w-full px-4 py-2 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
          <input
            type="password"
            required
            className="w-full px-4 py-2 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        {message && (
          <p className={`text-sm font-medium ${message.type === 'success' ? 'text-green-600' : 'text-red-600'}`}>
            {message.text}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl disabled:opacity-50 transition"
        >
          {loading ? "Loading..." : isSignUp ? "Sign Up" : "Sign In"}
        </button>
      </form>

      <div className="mt-6 text-center text-sm text-gray-600">
        {isSignUp ? "Already have an account? " : "New to the platform? "}
        <button
          onClick={() => { setIsSignUp(!isSignUp); setMessage(null); }}
          className="text-blue-600 font-semibold hover:underline bg-transparent border-none p-0"
        >
          {isSignUp ? "Sign In" : "Create one"}
        </button>
      </div>
    </div>
  );
}