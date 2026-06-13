"use client";

import { useState } from "react";

export default function SendMailPage() {
  const [form, setForm] = useState({ to: "", subject: "", body: "" });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      const res = await fetch("/api/mail/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(
          typeof data.error === "string"
            ? data.error
            : "Failed to send email"
        );
      }

      setMessage({
        type: "success",
        text: `✅ Email sent to ${form.to}!`,
      });
      setForm({ to: "", subject: "", body: "" });
    } catch (err: any) {
      setMessage({ type: "error", text: `❌ ${err.message}` });
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="max-w-2xl mx-auto mt-10 p-6">
      <h1 className="text-3xl font-bold mb-2">📧 Send Email</h1>
      <p className="text-gray-600 mb-6">
        Send an email via Nodemailer + Gmail SMTP
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">To</label>
          <input
            type="email"
            value={form.to}
            onChange={(e) => setForm({ ...form, to: e.target.value })}
            placeholder="recipient@example.com"
            className="w-full border rounded px-3 py-2"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Subject</label>
          <input
            type="text"
            value={form.subject}
            onChange={(e) => setForm({ ...form, subject: e.target.value })}
            placeholder="Hello from Odoo!"
            className="w-full border rounded px-3 py-2"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Body</label>
          <textarea
            value={form.body}
            onChange={(e) => setForm({ ...form, body: e.target.value })}
            placeholder="Write your message here..."
            rows={8}
            className="w-full border rounded px-3 py-2 resize-y"
            required
          />
          <p className="text-xs text-gray-500 mt-1">
            {form.body.length} / 10000 characters
          </p>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-semibold"
        >
          {loading ? "Sending..." : "📨 Send Email"}
        </button>
      </form>

      {message && (
        <div
          className={`mt-4 p-3 rounded ${
            message.type === "success"
              ? "bg-green-50 text-green-800"
              : "bg-red-50 text-red-800"
          }`}
        >
          {message.text}
        </div>
      )}

      <div className="mt-6 p-4 bg-blue-50 text-blue-900 rounded text-sm">
        <p>
          <strong>💡 Tips:</strong>
        </p>
        <ul className="list-disc list-inside mt-2 space-y-1">
          <li>Email is sent FROM your Gmail address</li>
          <li>Check spam folder if it doesn't arrive</li>
          <li>Gmail limits: ~500 emails/day for free accounts</li>
          <li>First email might take 10-30 seconds (SMTP handshake)</li>
        </ul>
      </div>
    </main>
  );
}