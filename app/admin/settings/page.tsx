"use client";

import { Fraunces } from "next/font/google";
import { Save } from "lucide-react";

const fraunces = Fraunces({
  weight: ["300", "400", "700", "900"],
  subsets: ["latin"],
  variable: "--font-fraunces",
});

export default function SettingsPage() {
  return (
    <div>
      <div className="mb-6">
        <h1
          className={`${fraunces.className} text-xl font-bold text-[#000505]`}
        >
          Settings
        </h1>
        <p className="text-sm text-[#705C53] mt-0.5">
          Configure your cafe
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div
          className="bg-[#FDFBF7] rounded-xl p-6"
          style={{
            boxShadow:
              "0 2px 4px rgba(112,92,83,0.04), 0 6px 20px rgba(112,92,83,0.06)",
          }}
        >
          <h2
            className={`${fraunces.className} text-base font-bold text-[#000505] mb-4`}
          >
            General
          </h2>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-[#705C53] mb-1.5 uppercase tracking-[0.08em]">
                Cafe Name
              </label>
              <input
                type="text"
                defaultValue="Cafe POS"
                className="w-full px-4 py-2.5 bg-[#FDFBF7] border border-[#E8E0D8] rounded-lg text-sm text-[#000505] focus:outline-none focus:border-[#C86446] focus:ring-2 focus:ring-[#C86446]/15 transition-all duration-200"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#705C53] mb-1.5 uppercase tracking-[0.08em]">
                Currency
              </label>
              <select className="w-full px-4 py-2.5 bg-[#FDFBF7] border border-[#E8E0D8] rounded-lg text-sm text-[#000505] focus:outline-none focus:border-[#C86446] focus:ring-2 focus:ring-[#C86446]/15 transition-all duration-200">
                <option>USD ($)</option>
                <option>EUR (€)</option>
                <option>GBP (£)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-[#705C53] mb-1.5 uppercase tracking-[0.08em]">
                Tax Rate (%)
              </label>
              <input
                type="number"
                defaultValue="8"
                className="w-full px-4 py-2.5 bg-[#FDFBF7] border border-[#E8E0D8] rounded-lg text-sm text-[#000505] focus:outline-none focus:border-[#C86446] focus:ring-2 focus:ring-[#C86446]/15 transition-all duration-200"
              />
            </div>
          </div>
        </div>

        <div
          className="bg-[#FDFBF7] rounded-xl p-6"
          style={{
            boxShadow:
              "0 2px 4px rgba(112,92,83,0.04), 0 6px 20px rgba(112,92,83,0.06)",
          }}
        >
          <h2
            className={`${fraunces.className} text-base font-bold text-[#000505] mb-4`}
          >
            Business Hours
          </h2>
          <div className="space-y-4">
            {["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"].map(
              (day) => (
                <div key={day} className="flex items-center justify-between">
                  <span className="text-sm text-[#000505] w-24">{day}</span>
                  <div className="flex items-center gap-2">
                    <input
                      type="time"
                      defaultValue="07:00"
                      className="px-3 py-1.5 bg-[#FDFBF7] border border-[#E8E0D8] rounded-lg text-sm text-[#000505] focus:outline-none focus:border-[#C86446] transition-all duration-200"
                    />
                    <span className="text-xs text-[#C4B8AC]">to</span>
                    <input
                      type="time"
                      defaultValue="22:00"
                      className="px-3 py-1.5 bg-[#FDFBF7] border border-[#E8E0D8] rounded-lg text-sm text-[#000505] focus:outline-none focus:border-[#C86446] transition-all duration-200"
                    />
                  </div>
                </div>
              )
            )}
          </div>
        </div>
      </div>

      <div className="mt-6 flex justify-end">
        <button className="flex items-center gap-2 bg-[#C86446] text-white px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-[#B55A3E] transition-all duration-200 cursor-pointer">
          <Save className="w-4 h-4" />
          Save Changes
        </button>
      </div>
    </div>
  );
}
