import { useState, useEffect } from "react";
import { 
  Briefcase, 
  ChevronRight, 
  Clipboard, 
  MessageSquare, 
  Calendar, 
  AlertCircle,
  Clock,
  X
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
  overallScore: number;
  status: string;
  appliedAt: string | null;
  coverLetterUsed: string | null;
  notes: string | null;
  createdAt: string;
}

const COLUMNS = [
  { id: "DISCOVERED", name: "Discovered", color: "border-t-blue-500 bg-blue-500/5 text-blue-400" },
  { id: "APPLIED", name: "Applied", color: "border-t-purple-500 bg-purple-500/5 text-purple-400" },
  { id: "UNDER_REVIEW", name: "Under Review", color: "border-t-cyan-500 bg-cyan-500/5 text-cyan-400" },
  { id: "INTERVIEW_SCHEDULED", name: "Interviews", color: "border-t-amber-500 bg-amber-500/5 text-amber-400" },
  { id: "REJECTED", name: "Rejected", color: "border-t-rose-500 bg-rose-500/5 text-rose-400" },
  { id: "OFFER_RECEIVED", name: "Offers", color: "border-t-emerald-500 bg-emerald-500/5 text-emerald-400" }
];

export default function Tracker() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  
  // Card Details & Notes Edit state
  const [notesText, setNotesText] = useState("");
  const [copied, setCopied] = useState(false);

  const loadJobs = () => {
    setLoading(true);
    fetch(`${BACKEND_URL}/api/jobs`)
      .then(res => res.json())
      .then(data => {
        setJobs(data);
        setLoading(false);
      })
      .catch(err => {
        console.error("Error loading tracker jobs:", err);
        setLoading(false);
      });
  };

  useEffect(() => {
    loadJobs();
  }, []);

  // Sync state notes text
  useEffect(() => {
    if (selectedJob) {
      setNotesText(selectedJob.notes || "");
    }
  }, [selectedJob]);

  // Drag and Drop Handlers
  const handleDragStart = (e: React.DragEvent, id: string) => {
    e.dataTransfer.setData("text/plain", id);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (e: React.DragEvent, targetStatus: string) => {
    e.preventDefault();
    const id = e.dataTransfer.getData("text/plain");
    
    // Optimistic UI update
    setJobs(prevJobs => prevJobs.map(j => j.id === id ? { ...j, status: targetStatus } : j));

    try {
      const res = await fetch(`${BACKEND_URL}/api/jobs/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: targetStatus })
      });
      if (!res.ok) {
        throw new Error("Failed to update status on server");
      }
    } catch (err) {
      console.error(err);
      // Revert if error
      loadJobs();
    }
  };

  // Save notes handler
  const saveNotes = async () => {
    if (!selectedJob) return;
    try {
      // In prisma, we can patch notes endpoint or use a custom endpoint.
      // For simplicity, we can update the notes by sending a PATCH to database.
      // Since we don't have a separate notes patch, we can extend the status endpoint
      // or implement notes field inside backend index.ts
      // Wait, let's check if the backend /api/jobs/:id/status updates general fields or just status.
      // In backend/src/index.ts we have:
      // app.patch("/api/jobs/:id/status", async (req, res) => {
      //   const { status } = req.body;
      //   const updatedJob = await prisma.job.update({ where: { id }, data: { status } });
      // })
      // Ah! It only updates status!
      // Let's make sure we support saving notes. We can save notes by using a custom route
      // or editing the server. Let's make sure we add a note saving endpoint on the server later,
      // or for now, we can update the status PATCH endpoint to accept optional notes and appliedAt fields!
      // Let's write the fetch update to /api/jobs/:id/notes which we will add to the backend,
      // or we can write a fetch to the backend index.ts that supports note updating.
      // Wait! Let's check: in backend/src/index.ts, did we have a route for general job updates? No, we had:
      // app.patch("/api/jobs/:id/status", async (req, res) => { ... })
      // Let's create a quick route or update it so we can update notes!
      // Wait, let's check if we can update the backend index.ts to include `/api/jobs/:id/notes` route.
      // Yes! We can make a quick replacement in backend/src/index.ts to add note updates.
      // Let's do that right after creating this file.
      const res = await fetch(`${BACKEND_URL}/api/jobs/${selectedJob.id}/notes`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes: notesText })
      });

      if (res.ok) {
        const updated = await res.json();
        // Update local state
        setJobs(jobs.map(j => j.id === selectedJob.id ? { ...j, notes: notesText } : j));
        setSelectedJob({ ...selectedJob, notes: notesText });
        alert("Notes saved successfully!");
      } else {
        alert("Failed to save notes.");
      }
    } catch (err) {
      console.error(err);
      alert("Error saving notes.");
    }
  };

  const copyCoverLetter = () => {
    if (!selectedJob?.coverLetterUsed) return;
    navigator.clipboard.writeText(selectedJob.coverLetterUsed);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="h-full flex flex-col space-y-4">
      {/* Kanban Board Layout */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
        </div>
      ) : (
        <div className="flex-1 overflow-x-auto pb-4 flex gap-4 scrollbar-thin select-none">
          {COLUMNS.map((col) => {
            const colJobs = jobs.filter(j => j.status === col.id);
            return (
              <div
                key={col.id}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, col.id)}
                className="flex-shrink-0 w-80 bg-gray-900/30 border border-gray-800/60 rounded-2xl flex flex-col overflow-hidden"
              >
                {/* Column Title */}
                <div className={`p-4 border-t-4 border-b border-gray-800 ${col.color} flex items-center justify-between`}>
                  <span className="font-heading font-bold text-sm">{col.name}</span>
                  <span className="text-xs bg-gray-800/80 px-2 py-0.5 rounded-full font-bold">
                    {colJobs.length}
                  </span>
                </div>

                {/* Cards Container */}
                <div className="flex-1 p-3 space-y-3 overflow-y-auto kanban-col max-h-[calc(100vh-270px)]">
                  {colJobs.map((job) => (
                    <div
                      key={job.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, job.id)}
                      onClick={() => setSelectedJob(job)}
                      className="glass-panel p-4 rounded-xl cursor-grab active:cursor-grabbing hover:border-indigo-500/40 transition-all border border-gray-800 bg-[#0d0e12] space-y-3 text-left"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] px-2 py-0.5 bg-gray-800 text-gray-400 font-bold uppercase rounded">
                          {job.portal}
                        </span>
                        <span className="text-xs font-bold text-indigo-400 font-mono">
                          {Math.round(job.overallScore)}% match
                        </span>
                      </div>
                      <div>
                        <h5 className="font-bold text-sm text-gray-200 line-clamp-1">{job.title}</h5>
                        <span className="text-xs text-gray-500 font-medium block mt-0.5">{job.company}</span>
                      </div>
                      
                      {job.appliedAt && (
                        <div className="flex items-center space-x-1 text-[10px] text-gray-500">
                          <Clock className="h-3 w-3" />
                          <span>Applied {new Date(job.appliedAt).toLocaleDateString()}</span>
                        </div>
                      )}
                    </div>
                  ))}

                  {colJobs.length === 0 && (
                    <div className="flex items-center justify-center h-28 text-xs text-gray-600 text-center px-4 border border-dashed border-gray-800 rounded-xl">
                      Drag jobs here
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Detail Modal Overlay */}
      {selectedJob && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-panel bg-[#0d0e12] border border-gray-800 w-full max-w-3xl max-h-[90vh] rounded-2xl flex flex-col overflow-hidden animate-zoom-in">
            {/* Modal Header */}
            <div className="p-5 border-b border-gray-800 flex items-center justify-between">
              <div>
                <h4 className="text-lg font-bold text-gray-100 flex items-center space-x-2">
                  <Briefcase className="h-5 w-5 text-indigo-400" />
                  <span>{selectedJob.title}</span>
                </h4>
                <span className="text-sm text-gray-400 font-medium mt-0.5 block">{selectedJob.company} — <span className="text-gray-500">{selectedJob.location}</span></span>
              </div>
              <button
                onClick={() => setSelectedJob(null)}
                className="p-1 hover:bg-gray-800 rounded-lg text-gray-500 hover:text-white transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Content Scrollable */}
            <div className="flex-1 p-6 overflow-y-auto space-y-6 text-left">
              {/* Cover Letter Section */}
              {selectedJob.coverLetterUsed && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h5 className="text-sm font-bold text-gray-300">Generated Cover Letter</h5>
                    <button
                      onClick={copyCoverLetter}
                      className="text-xs bg-gray-800 text-indigo-400 border border-gray-700/50 hover:bg-gray-700 px-2.5 py-1 rounded-lg flex items-center space-x-1.5 transition-colors font-medium"
                    >
                      <Clipboard className="h-3.5 w-3.5" />
                      <span>{copied ? "Copied!" : "Copy"}</span>
                    </button>
                  </div>
                  <pre className="p-4 bg-[#050608] text-xs text-gray-400 rounded-xl border border-gray-800/80 font-sans whitespace-pre-wrap leading-relaxed select-text">
                    {selectedJob.coverLetterUsed}
                  </pre>
                </div>
              )}

              {/* Notes Section */}
              <div className="space-y-2">
                <h5 className="text-sm font-bold text-gray-300 flex items-center space-x-1.5">
                  <MessageSquare className="h-4 w-4 text-indigo-400" />
                  <span>Interview & Application Notes</span>
                </h5>
                <textarea
                  value={notesText}
                  onChange={(e) => setNotesText(e.target.value)}
                  placeholder="Type notes here (e.g. interviewer name, salary offered, follow-up date)..."
                  className="w-full h-32 p-3 bg-gray-900/40 border border-gray-800 rounded-xl text-xs text-gray-300 placeholder-gray-600 focus:border-indigo-500 outline-none transition-colors select-text resize-none"
                ></textarea>
                <div className="flex justify-end">
                  <button
                    onClick={saveNotes}
                    className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs px-4 py-2 rounded-lg transition-colors"
                  >
                    Save Notes
                  </button>
                </div>
              </div>

              {/* Job Description Summary */}
              <div className="space-y-2">
                <h5 className="text-sm font-bold text-gray-300">Job Description</h5>
                <p className="text-xs text-gray-500 leading-relaxed max-h-40 overflow-y-auto border border-gray-800/50 p-3 rounded-lg select-text scrollbar-thin">
                  {selectedJob.description}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
