import { useState, useEffect } from "react";
import { 
  Search, 
  RefreshCw, 
  Send, 
  ExternalLink, 
  Terminal as TerminalIcon, 
  X, 
  AlertCircle,
  CheckCircle,
  SlidersHorizontal
} from "lucide-react";

const BACKEND_URL = "http://localhost:5000";

interface Job {
  id: string;
  title: string;
  company: string;
  location: string;
  portal: string;
  jobUrl: string;
  description: string;
  salary: string | null;
  skillScore: number;
  experienceScore: number;
  locationScore: number;
  salaryScore: number;
  overallScore: number;
  status: string;
}

interface LogEntry {
  id: string;
  message: string;
  level: string;
  timestamp: string;
}

export default function Jobs() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [scanning, setScanning] = useState<boolean>(false);
  
  // Search and Filter States
  const [searchQuery, setSearchQuery] = useState("");
  const [minScore, setMinScore] = useState<number>(0);
  const [selectedPortal, setSelectedPortal] = useState("all");

  // Terminal log overlay states
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [activeJobTitle, setActiveJobTitle] = useState("");
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [logPollingInterval, setLogPollingInterval] = useState<NodeJS.Timeout | null>(null);

  const loadJobs = () => {
    setLoading(true);
    fetch(`${BACKEND_URL}/api/jobs`)
      .then(res => res.json())
      .then(data => {
        setJobs(data);
        setLoading(false);
      })
      .catch(err => {
        console.error("Error fetching jobs:", err);
        setLoading(false);
      });
  };

  useEffect(() => {
    loadJobs();
  }, []);

  // Poll logs for the active running job application
  useEffect(() => {
    if (activeJobId) {
      const fetchLogs = () => {
        fetch(`${BACKEND_URL}/api/jobs/${activeJobId}/logs`)
          .then(res => res.json())
          .then((data: LogEntry[]) => {
            setLogs(data);
            
            // Auto scroll terminal to bottom if open
            const term = document.getElementById("terminal-body");
            if (term) {
              term.scrollTop = term.scrollHeight;
            }
          })
          .catch(err => console.error("Error polling logs:", err));
      };

      fetchLogs(); // initial load
      const interval = setInterval(fetchLogs, 2000); // Poll every 2 seconds
      return () => clearInterval(interval);
    }
  }, [activeJobId]);

  const triggerJobDiscovery = async () => {
    setScanning(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/jobs/discover`, { method: "POST" });
      if (res.ok) {
        alert("Discovery campaign launched! The scanner will look for matching jobs in the background.");
        setTimeout(() => {
          loadJobs();
          setScanning(false);
        }, 4000); // reload after 4 seconds
      } else {
        setScanning(false);
      }
    } catch (err) {
      console.error(err);
      setScanning(false);
    }
  };

  const triggerAutoApply = async (job: Job) => {
    setActiveJobId(job.id);
    setActiveJobTitle(`${job.title} at ${job.company}`);
    setLogs([]); // Reset logs panel

    try {
      const res = await fetch(`${BACKEND_URL}/api/jobs/apply/${job.id}`, { method: "POST" });
      if (!res.ok) {
        const errorData = await res.json();
        alert("Failed to start application automation: " + errorData.error);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleStatusChange = async (id: string, status: string) => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/jobs/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status })
      });
      if (res.ok) {
        // Update local state
        setJobs(jobs.map(j => j.id === id ? { ...j, status } : j));
      }
    } catch (err) {
      console.error("Failed to update job status:", err);
    }
  };

  // Filter computation
  const filteredJobs = jobs.filter(job => {
    const matchesSearch = job.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          job.company.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesScore = job.overallScore >= minScore;
    const matchesPortal = selectedPortal === "all" || job.portal.toLowerCase() === selectedPortal.toLowerCase();
    return matchesSearch && matchesScore && matchesPortal;
  });

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-emerald-400 bg-emerald-500/10 border-emerald-500/20";
    if (score >= 65) return "text-indigo-400 bg-indigo-500/10 border-indigo-500/20";
    return "text-amber-400 bg-amber-500/10 border-amber-500/20";
  };

  return (
    <div className="space-y-6 relative h-full">
      {/* Top action and filter bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative w-64">
            <Search className="absolute left-3.5 top-3 h-4 w-4 text-gray-500" />
            <input
              type="text"
              placeholder="Search by job or company..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-gray-900/50 border border-gray-800 rounded-xl text-sm focus:border-indigo-500 outline-none transition-colors"
            />
          </div>

          <div className="flex items-center space-x-2 bg-gray-900/50 border border-gray-800 rounded-xl px-3 py-2 text-sm">
            <SlidersHorizontal className="h-4 w-4 text-gray-400" />
            <span className="text-gray-400">Portal:</span>
            <select
              value={selectedPortal}
              onChange={(e) => setSelectedPortal(e.target.value)}
              className="bg-transparent text-gray-200 outline-none cursor-pointer pr-2"
            >
              <option value="all" className="bg-[#0b0c10]">All Portals</option>
              <option value="linkedin" className="bg-[#0b0c10]">LinkedIn</option>
              <option value="indeed" className="bg-[#0b0c10]">Indeed</option>
              <option value="internshala" className="bg-[#0b0c10]">Internshala</option>
            </select>
          </div>

          <div className="flex items-center space-x-2 bg-gray-900/50 border border-gray-800 rounded-xl px-3 py-2 text-sm">
            <span className="text-gray-400">Score:</span>
            <select
              value={minScore}
              onChange={(e) => setMinScore(Number(e.target.value))}
              className="bg-transparent text-gray-200 outline-none cursor-pointer pr-2"
            >
              <option value={0} className="bg-[#0b0c10]">&gt; 0% Match</option>
              <option value={70} className="bg-[#0b0c10]">&gt; 70% Match</option>
              <option value={80} className="bg-[#0b0c10]">&gt; 80% Match</option>
              <option value={90} className="bg-[#0b0c10]">&gt; 90% Match</option>
            </select>
          </div>
        </div>

        {/* Discovery Scan Trigger */}
        <button
          onClick={triggerJobDiscovery}
          disabled={scanning}
          className="glow-btn bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white px-5 py-2.5 rounded-xl text-sm font-semibold flex items-center space-x-2 shadow-lg shadow-indigo-900/20 transition-all disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${scanning ? "animate-spin" : ""}`} />
          <span>{scanning ? "Discovering..." : "Scan for Jobs"}</span>
        </button>
      </div>

      {/* Main Jobs Listing */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
        </div>
      ) : filteredJobs.length > 0 ? (
        <div className="grid grid-cols-1 gap-4">
          {filteredJobs.map((job) => (
            <div key={job.id} className="glass-card p-5 flex flex-col lg:flex-row justify-between lg:items-center gap-5 border border-gray-800/40 hover:border-gray-700/60 transition-all">
              {/* Job Info */}
              <div className="space-y-2 max-w-xl">
                <div className="flex items-center space-x-3">
                  <span className="text-xs px-2.5 py-1 bg-gray-800 text-gray-400 font-bold tracking-wider rounded-lg uppercase">
                    {job.portal}
                  </span>
                  {job.salary && (
                    <span className="text-xs text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-md font-mono font-semibold">
                      {job.salary}
                    </span>
                  )}
                </div>
                <div>
                  <h4 className="text-lg font-bold text-gray-100">{job.title}</h4>
                  <span className="text-sm text-gray-400 font-medium">{job.company} — <span className="text-gray-500">{job.location}</span></span>
                </div>
                <p className="text-xs text-gray-500 line-clamp-2 leading-relaxed">
                  {job.description}
                </p>
              </div>

              {/* Match Scores */}
              <div className="flex items-center space-x-6 bg-gray-900/30 p-3 rounded-xl border border-gray-800/30">
                <div className="text-center">
                  <span className="block text-[10px] text-gray-500 font-semibold uppercase tracking-wider">Overall Match</span>
                  <span className={`inline-block mt-1 font-bold text-sm border rounded-lg px-2 py-0.5 ${getScoreColor(job.overallScore)}`}>
                    {Math.round(job.overallScore)}%
                  </span>
                </div>
                <div className="text-center border-l border-gray-800 pl-4">
                  <span className="block text-[10px] text-gray-500 font-medium">Skills</span>
                  <span className="text-xs font-semibold text-gray-300">{Math.round(job.skillScore)}%</span>
                </div>
                <div className="text-center border-l border-gray-800 pl-4">
                  <span className="block text-[10px] text-gray-500 font-medium">Exp</span>
                  <span className="text-xs font-semibold text-gray-300">{Math.round(job.experienceScore)}%</span>
                </div>
                <div className="text-center border-l border-gray-800 pl-4">
                  <span className="block text-[10px] text-gray-500 font-medium">Location</span>
                  <span className="text-xs font-semibold text-gray-300">{Math.round(job.locationScore)}%</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-3 lg:self-center">
                {/* Manual Link */}
                <a
                  href={job.jobUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="p-2.5 bg-gray-800 hover:bg-gray-700/80 text-gray-300 rounded-xl border border-gray-700/30 transition-colors"
                  title="Apply manually on website"
                >
                  <ExternalLink className="h-4.5 w-4.5" />
                </a>

                {/* Auto Apply Action */}
                {job.status === "DISCOVERED" ? (
                  <button
                    onClick={() => triggerAutoApply(job)}
                    className="glow-btn bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-sm px-4 py-2.5 rounded-xl flex items-center space-x-2 transition-colors shadow-md shadow-indigo-900/10"
                  >
                    <Send className="h-4 w-4" />
                    <span>Auto Apply</span>
                  </button>
                ) : (
                  <div className="flex items-center space-x-2">
                    <select
                      value={job.status}
                      onChange={(e) => handleStatusChange(job.id, e.target.value)}
                      className="bg-gray-800 border border-gray-700 text-gray-300 text-xs font-semibold rounded-xl px-3 py-2.5 outline-none cursor-pointer"
                    >
                      <option value="DISCOVERED">Discovered</option>
                      <option value="APPLIED">Applied</option>
                      <option value="UNDER_REVIEW">Under Review</option>
                      <option value="INTERVIEW_SCHEDULED">Interview</option>
                      <option value="REJECTED">Rejected</option>
                      <option value="OFFER_RECEIVED">Offer</option>
                    </select>
                    <button
                      onClick={() => {
                        setActiveJobId(job.id);
                        setActiveJobTitle(`${job.title} at ${job.company}`);
                      }}
                      className="p-2.5 bg-gray-900/60 hover:bg-gray-800 border border-gray-800 text-gray-400 hover:text-white rounded-xl"
                      title="View execution terminal logs"
                    >
                      <TerminalIcon className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-20 border-2 border-dashed border-gray-800 rounded-2xl">
          <AlertCircle className="h-10 w-10 text-gray-600 mx-auto mb-4" />
          <h4 className="text-lg font-bold text-gray-400">No discovered jobs</h4>
          <p className="text-sm text-gray-500 max-w-sm mx-auto mt-1">
            Fill your profile information, upload a resume, and trigger a scan to discover matching jobs.
          </p>
        </div>
      )}

      {/* Terminal Log Console Drawer */}
      {activeJobId && (
        <div className="fixed inset-y-0 right-0 w-[550px] bg-[#0c0e12] border-l border-gray-800 shadow-2xl z-50 flex flex-col animate-slide-in">
          {/* Terminal Title Header */}
          <div className="p-4 border-b border-gray-800 bg-gray-900/20 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="h-3 w-3 rounded-full bg-rose-500"></div>
              <div className="h-3 w-3 rounded-full bg-amber-500"></div>
              <div className="h-3 w-3 rounded-full bg-emerald-500"></div>
              <span className="text-xs font-mono font-bold text-gray-400 pl-2">
                apppilot-copilot-engine logs
              </span>
            </div>
            <button
              onClick={() => setActiveJobId(null)}
              className="text-gray-500 hover:text-white p-1 hover:bg-gray-800 rounded-lg transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Job details banner */}
          <div className="bg-indigo-950/20 border-b border-indigo-900/20 p-4">
            <span className="text-xs text-indigo-400 uppercase tracking-widest font-semibold block">Active Automation Target</span>
            <span className="text-sm text-gray-200 font-bold block mt-0.5">{activeJobTitle}</span>
          </div>

          {/* Terminal Console Output */}
          <div 
            id="terminal-body"
            className="flex-1 p-5 overflow-y-auto font-mono text-xs leading-relaxed text-emerald-400 bg-[#050608] space-y-2 terminal-scrollbar"
          >
            <span className="text-gray-600 font-semibold block">Initializing log capture console...</span>
            {logs.map((log) => (
              <div key={log.id} className="flex items-start space-x-2">
                <span className="text-gray-600 select-none">[{new Date(log.timestamp).toLocaleTimeString()}]</span>
                <span className={log.level === "error" ? "text-rose-400" : log.level === "warn" ? "text-amber-400" : "text-emerald-400"}>
                  {log.level === "error" ? "✗" : log.level === "warn" ? "⚠" : "✓"} {log.message}
                </span>
              </div>
            ))}
            {logs.length === 0 && (
              <span className="text-gray-500 block animate-pulse">Waiting for logs stream from background queue worker...</span>
            )}
          </div>

          {/* Terminal Info Footer */}
          <div className="p-4 bg-gray-900/30 border-t border-gray-800 text-[10px] text-gray-500 flex items-center justify-between">
            <span>Co-Pilot status: Listening to active port 5000</span>
            <span className="flex items-center space-x-1">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping"></span>
              <span className="font-semibold">Live connection</span>
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
