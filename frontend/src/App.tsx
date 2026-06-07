import { useState, useEffect } from "react";
import { 
  LayoutDashboard, 
  Briefcase, 
  KanbanSquare, 
  User, 
  Settings, 
  Activity, 
  CheckCircle2, 
  XCircle 
} from "lucide-react";
import Dashboard from "./components/Dashboard";
import Jobs from "./components/Jobs";
import Tracker from "./components/Tracker";
import Profile from "./components/Profile";
import SettingsPage from "./components/Settings";

const BACKEND_URL = "http://localhost:5000";

export default function App() {
  const [activeTab, setActiveTab] = useState<string>("dashboard");
  const [dbConnected, setDbConnected] = useState<boolean>(true);
  const [redisConnected, setRedisConnected] = useState<boolean>(true);

  // Check backend server and DB status
  useEffect(() => {
    const checkStatus = async () => {
      try {
        const res = await fetch(`${BACKEND_URL}/api/settings`);
        if (res.ok) {
          setDbConnected(true);
        } else {
          setDbConnected(false);
        }
      } catch (err) {
        setDbConnected(false);
      }
    };
    checkStatus();
    const interval = setInterval(checkStatus, 10000);
    return () => clearInterval(interval);
  }, []);

  const menuItems = [
    { id: "dashboard", name: "Dashboard", icon: LayoutDashboard },
    { id: "jobs", name: "Job Discovery", icon: Briefcase },
    { id: "tracker", name: "Application Tracker", icon: KanbanSquare },
    { id: "profile", name: "Resume & Profile", icon: User },
    { id: "settings", name: "Settings & Config", icon: Settings },
  ];

  return (
    <div className="flex h-screen bg-[#08090d] text-gray-100 overflow-hidden">
      {/* Sidebar Navigation */}
      <aside className="w-64 glass-panel border-r border-gray-800 flex flex-col justify-between m-4 mr-0 rounded-2xl">
        <div>
          {/* Logo */}
          <div className="p-6 flex items-center space-x-3 border-b border-gray-800">
            <div className="p-2 bg-gradient-to-tr from-indigo-500 to-purple-500 rounded-xl">
              <Activity className="h-6 w-6 text-white animate-pulse" />
            </div>
            <div>
              <span className="text-xl font-extrabold font-heading bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
                AppPilot AI
              </span>
              <span className="block text-xs text-gray-500 font-medium tracking-widest uppercase">
                Job Co-Pilot
              </span>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="p-4 space-y-1">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                    isActive
                      ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-900/30"
                      : "text-gray-400 hover:bg-gray-800/40 hover:text-white"
                  }`}
                >
                  <Icon className={`h-5 w-5 ${isActive ? "text-white" : "text-gray-400"}`} />
                  <span>{item.name}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* System Health Check Footer */}
        <div className="p-4 border-t border-gray-800 space-y-2">
          <div className="flex items-center justify-between text-xs px-2">
            <span className="text-gray-500 font-medium">PostgreSQL DB</span>
            <span className="flex items-center space-x-1 font-semibold">
              {dbConnected ? (
                <>
                  <span className="text-emerald-400">Connected</span>
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                </>
              ) : (
                <>
                  <span className="text-rose-400">Offline</span>
                  <XCircle className="h-3.5 w-3.5 text-rose-400" />
                </>
              )}
            </span>
          </div>
          <div className="flex items-center justify-between text-xs px-2">
            <span className="text-gray-500 font-medium">Redis Queue</span>
            <span className="flex items-center space-x-1 font-semibold">
              {dbConnected && redisConnected ? (
                <>
                  <span className="text-emerald-400">Online</span>
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                </>
              ) : (
                <>
                  <span className="text-amber-400">Unreachable</span>
                  <XCircle className="h-3.5 w-3.5 text-amber-400" />
                </>
              )}
            </span>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col m-4 overflow-hidden">
        {/* Top Header */}
        <header className="flex justify-between items-center mb-4 px-2">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-white capitalize">
              {activeTab === "jobs" ? "Job Discovery Engine" : `${activeTab}`}
            </h2>
            <p className="text-sm text-gray-500">
              {activeTab === "dashboard" && "Track your autonomous application campaign performance."}
              {activeTab === "jobs" && "Evaluate and apply to AI-matched listings automatically."}
              {activeTab === "tracker" && "Manage application pipelines and review status logs."}
              {activeTab === "profile" && "Manage your professional details, templates, and resumes."}
              {activeTab === "settings" && "Configure browser parameters, API credentials, and notifications."}
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <span className="text-xs bg-gray-800 text-gray-400 px-3 py-1.5 rounded-lg font-mono">
              Local Time: 11:39 AM
            </span>
          </div>
        </header>

        {/* Tab Components Wrapper */}
        <div className="flex-1 overflow-y-auto glass-panel p-6 rounded-2xl relative">
          {activeTab === "dashboard" && <Dashboard />}
          {activeTab === "jobs" && <Jobs />}
          {activeTab === "tracker" && <Tracker />}
          {activeTab === "profile" && <Profile />}
          {activeTab === "settings" && <SettingsPage />}
        </div>
      </main>
    </div>
  );
}
