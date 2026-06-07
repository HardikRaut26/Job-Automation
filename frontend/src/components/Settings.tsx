import { useState, useEffect } from "react";
import { 
  Settings, 
  Key, 
  Cpu, 
  Bell, 
  Eye, 
  EyeOff, 
  Check, 
  Save 
} from "lucide-react";

const BACKEND_URL = "http://localhost:5000";

interface SettingsData {
  geminiApiKey: string;
  openaiApiKey: string;
  notificationType: string;
  notificationToken: string;
  notificationChatId: string;
  automationMode: string;
  headlessMode: boolean;
  useActiveBrowser: boolean;
  scheduleInterval: string;
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<SettingsData>({
    geminiApiKey: "",
    openaiApiKey: "",
    notificationType: "none",
    notificationToken: "",
    notificationChatId: "",
    automationMode: "co-pilot",
    headlessMode: false,
    useActiveBrowser: false,
    scheduleInterval: "manual"
  });

  const [loading, setLoading] = useState(true);
  const [showGemini, setShowGemini] = useState(false);
  const [showOpenAI, setShowOpenAI] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch(`${BACKEND_URL}/api/settings`)
      .then(res => res.json())
      .then(data => {
        setSettings({
          geminiApiKey: data.geminiApiKey || "",
          openaiApiKey: data.openaiApiKey || "",
          notificationType: data.notificationType || "none",
          notificationToken: data.notificationToken || "",
          notificationChatId: data.notificationChatId || "",
          automationMode: data.automationMode || "co-pilot",
          headlessMode: data.headlessMode ?? false,
          useActiveBrowser: data.useActiveBrowser ?? false,
          scheduleInterval: data.scheduleInterval || "manual"
        });
        setLoading(false);
      })
      .catch(err => {
        console.error("Error loading settings:", err);
        setLoading(false);
      });
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const val = type === "checkbox" ? (e.target as HTMLInputElement).checked : value;
    setSettings(prev => ({
      ...prev,
      [name]: val
    }));
  };

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = e.target;
    setSettings(prev => ({
      ...prev,
      [name]: checked
    }));
  };

  const saveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/settings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings)
      });
      if (res.ok) {
        alert("Configuration saved successfully!");
      } else {
        alert("Failed to save configuration.");
      }
    } catch (err) {
      console.error(err);
      alert("Error saving settings.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  return (
    <form onSubmit={saveSettings} className="space-y-6 text-left max-w-4xl">
      
      {/* 1. AI Configuration Card */}
      <div className="glass-card p-6 space-y-4">
        <h3 className="text-lg font-bold text-white flex items-center space-x-2 border-b border-gray-800 pb-3">
          <Key className="h-5 w-5 text-indigo-400" />
          <span>AI Language Model Setup</span>
        </h3>
        <p className="text-xs text-gray-500">
          Input your API credentials to drive resume parsing, suitability analysis, cover letter drafting, and question answering.
        </p>

        <div className="space-y-4 pt-2">
          {/* Gemini API */}
          <div className="space-y-1.5">
            <label className="text-xs text-gray-400 font-semibold uppercase tracking-wider block">Gemini API Key</label>
            <div className="relative">
              <input
                type={showGemini ? "text" : "password"}
                name="geminiApiKey"
                value={settings.geminiApiKey}
                onChange={handleInputChange}
                placeholder="Enter Gemini API key (e.g. AIzaSy...)"
                className="w-full bg-gray-900/40 border border-gray-800 rounded-xl pl-4 pr-10 py-2.5 text-sm text-gray-200 outline-none focus:border-indigo-500"
              />
              <button
                type="button"
                onClick={() => setShowGemini(!showGemini)}
                className="absolute right-3 top-3.5 text-gray-500 hover:text-white"
              >
                {showGemini ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <span className="block text-[10px] text-gray-600">
              * Recommended. Native Gemini SDK provides faster parsing performance.
            </span>
          </div>

          {/* OpenAI API */}
          <div className="space-y-1.5">
            <label className="text-xs text-gray-400 font-semibold uppercase tracking-wider block">OpenAI API Key (Fallback)</label>
            <div className="relative">
              <input
                type={showOpenAI ? "text" : "password"}
                name="openaiApiKey"
                value={settings.openaiApiKey}
                onChange={handleInputChange}
                placeholder="Enter OpenAI API key (e.g. sk-...)"
                className="w-full bg-gray-900/40 border border-gray-800 rounded-xl pl-4 pr-10 py-2.5 text-sm text-gray-200 outline-none focus:border-indigo-500"
              />
              <button
                type="button"
                onClick={() => setShowOpenAI(!showOpenAI)}
                className="absolute right-3 top-3.5 text-gray-500 hover:text-white"
              >
                {showOpenAI ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Automation Control Card */}
      <div className="glass-card p-6 space-y-4">
        <h3 className="text-lg font-bold text-white flex items-center space-x-2 border-b border-gray-800 pb-3">
          <Cpu className="h-5 w-5 text-indigo-400" />
          <span>Playwright Browser Controls</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
          {/* Apply Mode */}
          <div className="space-y-1.5">
            <label className="text-xs text-gray-400 font-semibold uppercase tracking-wider block">Automation Mode</label>
            <select
              name="automationMode"
              value={settings.automationMode}
              onChange={handleInputChange}
              className="w-full bg-gray-900/40 border border-gray-800 rounded-xl px-4 py-2.5 text-sm text-gray-200 outline-none focus:border-indigo-500 cursor-pointer"
            >
              <option value="co-pilot" className="bg-[#0b0c10]">Co-Pilot Mode (Recommended)</option>
              <option value="autonomous" className="bg-[#0b0c10]">Autonomous Mode (Full Auto)</option>
            </select>
            <span className="block text-[10px] text-gray-500 leading-relaxed mt-1">
              <strong>Co-Pilot</strong> fills all input forms on the page and pauses visually so you can check, solve captchas, and manually submit. <strong>Autonomous</strong> applies and clicks submit automatically.
            </span>
          </div>

          {/* Headless Mode */}
          <div className="space-y-3">
            <label className="text-xs text-gray-400 font-semibold uppercase tracking-wider block">Browser Visibility</label>
            <div className="flex items-center space-x-3 bg-gray-900/20 border border-gray-800/60 p-4 rounded-xl">
              <input
                type="checkbox"
                name="headlessMode"
                id="headlessMode"
                checked={settings.headlessMode}
                onChange={handleCheckboxChange}
                className="h-4 w-4 text-indigo-600 border-gray-800 rounded focus:ring-indigo-500 cursor-pointer bg-gray-900"
              />
              <label htmlFor="headlessMode" className="cursor-pointer">
                <span className="text-sm font-semibold text-gray-300 block">Run in Background (Headless)</span>
                <span className="text-[10px] text-gray-500">
                  Hides the Chromium browser window. Force disabled in Co-Pilot mode to allow captcha solving.
                </span>
              </label>
            </div>
          </div>

          {/* CDP Attachment Toggle */}
          <div className="space-y-3">
            <label className="text-xs text-gray-400 font-semibold uppercase tracking-wider block">Browser Session Integration</label>
            <div className="flex items-center space-x-3 bg-gray-900/20 border border-gray-800/60 p-4 rounded-xl">
              <input
                type="checkbox"
                name="useActiveBrowser"
                id="useActiveBrowser"
                checked={settings.useActiveBrowser}
                onChange={handleCheckboxChange}
                className="h-4 w-4 text-indigo-600 border-gray-800 rounded focus:ring-indigo-500 cursor-pointer bg-gray-900"
              />
              <label htmlFor="useActiveBrowser" className="cursor-pointer">
                <span className="text-sm font-semibold text-gray-300 block">Use Active Chrome Browser (CDP)</span>
                <span className="text-[10px] text-gray-500">
                  Connects to your active personal Chrome on port 9222. Reuses your active logins and sessions!
                </span>
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Scheduler & Notifications Card */}
      <div className="glass-card p-6 space-y-4">
        <h3 className="text-lg font-bold text-white flex items-center space-x-2 border-b border-gray-800 pb-3">
          <Bell className="h-5 w-5 text-indigo-400" />
          <span>Discovery Scanner & Notifications</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
          {/* Search Schedule */}
          <div className="space-y-1.5">
            <label className="text-xs text-gray-400 font-semibold uppercase tracking-wider block">Job Discovery Frequency</label>
            <select
              name="scheduleInterval"
              value={settings.scheduleInterval}
              onChange={handleInputChange}
              className="w-full bg-gray-900/40 border border-gray-800 rounded-xl px-4 py-2.5 text-sm text-gray-200 outline-none focus:border-indigo-500 cursor-pointer"
            >
              <option value="manual" className="bg-[#0b0c10]">Manual Trigger Only</option>
              <option value="hourly" className="bg-[#0b0c10]">Hourly background crawl</option>
              <option value="daily" className="bg-[#0b0c10]">Daily background crawl</option>
              <option value="weekly" className="bg-[#0b0c10]">Weekly background crawl</option>
            </select>
          </div>

          {/* Notification Provider */}
          <div className="space-y-1.5">
            <label className="text-xs text-gray-400 font-semibold uppercase tracking-wider block">Notification Service</label>
            <select
              name="notificationType"
              value={settings.notificationType}
              onChange={handleInputChange}
              className="w-full bg-gray-900/40 border border-gray-800 rounded-xl px-4 py-2.5 text-sm text-gray-200 outline-none focus:border-indigo-500 cursor-pointer"
            >
              <option value="none" className="bg-[#0b0c10]">None (Mute Notifications)</option>
              <option value="telegram" className="bg-[#0b0c10]">Telegram Bot Alert</option>
              <option value="discord" className="bg-[#0b0c10]">Discord Webhook</option>
            </select>
          </div>

          {/* Conditional Notification Configuration */}
          {settings.notificationType === "telegram" && (
            <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4 bg-gray-900/10 p-4 rounded-xl border border-gray-800/40">
              <div className="space-y-1.5">
                <label className="text-xs text-gray-400 font-medium">Telegram Bot Token</label>
                <input
                  type="text"
                  name="notificationToken"
                  value={settings.notificationToken}
                  onChange={handleInputChange}
                  placeholder="Enter bot token (e.g. 123456:ABC-DEF)"
                  className="w-full bg-gray-900/40 border border-gray-800 rounded-xl px-3 py-2 text-xs text-gray-200 outline-none focus:border-indigo-500"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs text-gray-400 font-medium">Telegram Chat ID</label>
                <input
                  type="text"
                  name="notificationChatId"
                  value={settings.notificationChatId}
                  onChange={handleInputChange}
                  placeholder="Enter chat ID (e.g. -1001234567)"
                  className="w-full bg-gray-900/40 border border-gray-800 rounded-xl px-3 py-2 text-xs text-gray-200 outline-none focus:border-indigo-500"
                />
              </div>
            </div>
          )}

          {settings.notificationType === "discord" && (
            <div className="md:col-span-2 space-y-1.5 bg-gray-900/10 p-4 rounded-xl border border-gray-800/40">
              <label className="text-xs text-gray-400 font-medium">Discord Webhook URL</label>
              <input
                type="text"
                name="notificationToken"
                value={settings.notificationToken}
                onChange={handleInputChange}
                placeholder="Enter Discord webhook URL (e.g. https://discord.com/api/webhooks/...)"
                className="w-full bg-gray-900/40 border border-gray-800 rounded-xl px-3 py-2 text-xs text-gray-200 outline-none focus:border-indigo-500"
              />
            </div>
          )}
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <button
          type="submit"
          disabled={saving}
          className="glow-btn bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white px-6 py-3 rounded-xl text-sm font-bold flex items-center space-x-2 shadow-lg shadow-indigo-900/20 transition-all disabled:opacity-50"
        >
          {saving ? (
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
          ) : (
            <Save className="h-4.5 w-4.5" />
          )}
          <span>{saving ? "Saving Configurations..." : "Save Config Settings"}</span>
        </button>
      </div>

    </form>
  );
}
