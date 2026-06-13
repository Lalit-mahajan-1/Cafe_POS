"use client";

import { useState } from "react";

export default function GenerateQRPage() {
  const [text, setText] = useState("");
  const [qr, setQr] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [color, setColor] = useState("#000000");
  const [bgColor, setBgColor] = useState("#ffffff");
  const [size, setSize] = useState("300");

  const handleGenerate = async () => {
    if (!text.trim()) {
      setError("Please enter some text or URL");
      return;
    }

    setLoading(true);
    setError("");
    setQr("");

    try {
      const res = await fetch("/api/qr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, color, bgColor, size }),
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "Failed to generate QR");
      setQr(data.qr);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    if (!qr) return;
    const link = document.createElement("a");
    link.download = `qr-${Date.now()}.png`;
    link.href = qr;
    link.click();
  };

  return (
    <main className="max-w-xl mx-auto mt-10 p-6">
      <h1 className="text-3xl font-bold mb-2">📱 QR Code Generator</h1>
      <p className="text-gray-600 mb-6">
        Enter any text or URL → get a QR code instantly
      </p>

      {/* Input */}
      <textarea
        placeholder="Enter text, URL, phone number, email, WiFi password..."
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={3}
        className="w-full border rounded-lg px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
      />

      {/* Options */}
      <div className="mt-4 flex flex-wrap gap-4 items-center">
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-600">Color:</label>
          <input
            type="color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            className="w-8 h-8 rounded cursor-pointer border"
          />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-600">Background:</label>
          <input
            type="color"
            value={bgColor}
            onChange={(e) => setBgColor(e.target.value)}
            className="w-8 h-8 rounded cursor-pointer border"
          />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-600">Size:</label>
          <select
            value={size}
            onChange={(e) => setSize(e.target.value)}
            className="border rounded px-2 py-1 text-sm"
          >
            <option value="200">Small (200px)</option>
            <option value="300">Medium (300px)</option>
            <option value="500">Large (500px)</option>
            <option value="800">X-Large (800px)</option>
          </select>
        </div>
      </div>

      {/* Buttons */}
      <div className="mt-4 flex gap-3">
        <button
          onClick={handleGenerate}
          disabled={loading}
          className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-semibold"
        >
          {loading ? "Generating..." : "⚡ Generate QR"}
        </button>
        {qr && (
          <button
            onClick={handleDownload}
            className="px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold"
          >
            ⬇️ Download PNG
          </button>
        )}
      </div>

      {error && (
        <div className="mt-4 p-3 bg-red-50 text-red-800 rounded">❌ {error}</div>
      )}

      {/* QR Display */}
      {qr && (
        <div className="mt-8 flex flex-col items-center">
          <div className="p-4 bg-white border-2 border-gray-200 rounded-xl shadow-lg">
            <img src={qr} alt="QR Code" className="block" />
          </div>
          <p className="mt-3 text-sm text-gray-500 max-w-xs text-center break-all">
            Encoded: &quot;{text}&quot;
          </p>
        </div>
      )}

      {/* Quick Examples */}
      <div className="mt-8 p-4 bg-gray-50 rounded-lg">
        <p className="text-sm font-semibold mb-2">🧪 Quick Examples:</p>
        <div className="flex flex-wrap gap-2">
          {[
            { label: "URL", value: "https://github.com" },
            { label: "Phone", value: "tel:+919876543210" },
            { label: "Email", value: "mailto:hello@example.com" },
            { label: "WiFi", value: "WIFI:T:WPA;S:MyNetwork;P:password123;;" },
            { label: "UPI", value: "upi://pay?pa=user@upi&pn=Name&am=10" },
          ].map((ex) => (
            <button
              key={ex.label}
              onClick={() => setText(ex.value)}
              className="px-3 py-1 bg-white border rounded-full text-xs hover:bg-blue-50 hover:border-blue-300"
            >
              {ex.label}
            </button>
          ))}
        </div>
      </div>
    </main>
  );
}