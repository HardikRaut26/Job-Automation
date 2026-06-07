import { useState, useEffect } from "react";
import { 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  Briefcase, 
  FileText, 
  UploadCloud, 
  Sparkles,
  Plus,
  X,
  CheckCircle,
  Clock
} from "lucide-react";

const BACKEND_URL = "http://localhost:5000";

interface ProfileData {
  name: string;
  email: string;
  phone: string;
  address: string;
  noticePeriod: string;
  experienceYears: number;
  currentCtc: number;
  expectedCtc: number;
  skills: string[];
  preferredRoles: string[];
  locations: string[];
  workPreferences: string[];
  githubProfile: string;
  linkedinProfile: string;
  portfolioLinks: string[];
  coverLetterTpl: string;
}

export default function Profile() {
  const [profile, setProfile] = useState<ProfileData>({
    name: "",
    email: "",
    phone: "",
    address: "",
    noticePeriod: "Immediate",
    experienceYears: 0,
    currentCtc: 0,
    expectedCtc: 0,
    skills: [],
    preferredRoles: [],
    locations: [],
    workPreferences: [],
    githubProfile: "",
    linkedinProfile: "",
    portfolioLinks: [""],
    coverLetterTpl: ""
  });

  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [newSkill, setNewSkill] = useState("");
  const [newRole, setNewRole] = useState("");
  const [newLocation, setNewLocation] = useState("");
  const [highlighted, setHighlighted] = useState(false); // animations trigger

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = () => {
    fetch(`${BACKEND_URL}/api/profile`)
      .then(res => {
        if (!res.ok) throw new Error("No profile found");
        return res.json();
      })
      .then(data => {
        // Map nulls to empty values
        setProfile({
          name: data.name || "",
          email: data.email || "",
          phone: data.phone || "",
          address: data.address || "",
          noticePeriod: data.noticePeriod || "Immediate",
          experienceYears: data.experienceYears || 0,
          currentCtc: data.currentCtc || 0,
          expectedCtc: data.expectedCtc || 0,
          skills: data.skills || [],
          preferredRoles: data.preferredRoles || [],
          locations: data.locations || [],
          workPreferences: data.workPreferences || ["Remote"],
          githubProfile: data.githubProfile || "",
          linkedinProfile: data.linkedinProfile || "",
          portfolioLinks: data.portfolioLinks?.length > 0 ? data.portfolioLinks : [""],
          coverLetterTpl: data.coverLetterTpl || ""
        });
        setLoading(false);
      })
      .catch(err => {
        console.warn(err.message);
        setLoading(false);
      });
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setProfile(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    
    const formData = new FormData();
    formData.append("resume", file);
    
    setUploading(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/profile/resume`, {
        method: "POST",
        body: formData
      });
      const data = await res.json();
      if (res.ok) {
        // Hydrate parsed data
        setProfile({
          name: data.profile.name || "",
          email: data.profile.email || "",
          phone: data.profile.phone || "",
          address: data.profile.address || "",
          noticePeriod: data.profile.noticePeriod || "Immediate",
          experienceYears: data.profile.experienceYears || 0,
          currentCtc: data.profile.currentCtc || 0,
          expectedCtc: data.profile.expectedCtc || 0,
          skills: data.profile.skills || [],
          preferredRoles: data.profile.preferredRoles || [],
          locations: data.profile.locations || [],
          workPreferences: data.profile.workPreferences || ["Remote"],
          githubProfile: data.profile.githubProfile || "",
          linkedinProfile: data.profile.linkedinProfile || "",
          portfolioLinks: data.profile.portfolioLinks?.length > 0 ? data.profile.portfolioLinks : [""],
          coverLetterTpl: data.profile.coverLetterTpl || ""
        });
        
        // Trigger visual highlight animation
        setHighlighted(true);
        setTimeout(() => setHighlighted(false), 3000);
        
        alert("Resume successfully uploaded and parsed by AI!");
      } else {
        alert("Parsing failed: " + data.error);
      }
    } catch (err) {
      console.error(err);
      alert("Error uploading file.");
    } finally {
      setUploading(false);
    }
  };

  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(`${BACKEND_URL}/api/profile`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profile)
      });
      if (res.ok) {
        alert("Profile saved successfully!");
      } else {
        alert("Failed to save profile.");
      }
    } catch (err) {
      console.error(err);
      alert("Error saving profile details.");
    }
  };

  // Tag list builders
  const addSkill = () => {
    if (newSkill.trim() && !profile.skills.includes(newSkill.trim())) {
      setProfile(prev => ({ ...prev, skills: [...prev.skills, newSkill.trim()] }));
      setNewSkill("");
    }
  };
  
  const removeSkill = (skill: string) => {
    setProfile(prev => ({ ...prev, skills: prev.skills.filter(s => s !== skill) }));
  };

  const addRole = () => {
    if (newRole.trim() && !profile.preferredRoles.includes(newRole.trim())) {
      setProfile(prev => ({ ...prev, preferredRoles: [...prev.preferredRoles, newRole.trim()] }));
      setNewRole("");
    }
  };

  const removeRole = (role: string) => {
    setProfile(prev => ({ ...prev, preferredRoles: prev.preferredRoles.filter(r => r !== role) }));
  };

  const addLocation = () => {
    if (newLocation.trim() && !profile.locations.includes(newLocation.trim())) {
      setProfile(prev => ({ ...prev, locations: [...prev.locations, newLocation.trim()] }));
      setNewLocation("");
    }
  };

  const removeLocation = (loc: string) => {
    setProfile(prev => ({ ...prev, locations: prev.locations.filter(l => l !== loc) }));
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      
      {/* Resume Upload Column */}
      <div className="lg:col-span-1 space-y-6">
        <div className="glass-card p-6">
          <h3 className="text-lg font-bold text-white mb-4 flex items-center space-x-2">
            <FileText className="h-5 w-5 text-indigo-400" />
            <span>Upload Resume</span>
          </h3>
          
          {uploading ? (
            <div className="border-2 border-dashed border-indigo-500/40 bg-indigo-500/5 rounded-2xl p-8 text-center space-y-4">
              <div className="animate-pulse p-4 bg-indigo-500/10 rounded-full inline-block text-indigo-400">
                <Sparkles className="h-8 w-8 animate-spin" />
              </div>
              <h5 className="text-sm font-bold text-indigo-300">AppPilot AI is working</h5>
              <p className="text-xs text-gray-500 max-w-[200px] mx-auto leading-relaxed">
                Reading PDF contents, identifying skills, projects, and compiling your structured candidate profile...
              </p>
            </div>
          ) : (
            <label className="border-2 border-dashed border-gray-800 hover:border-indigo-500/60 bg-gray-900/10 hover:bg-indigo-950/5 rounded-2xl p-8 text-center cursor-pointer block transition-all">
              <input 
                type="file" 
                accept=".pdf" 
                onChange={handleFileUpload} 
                className="hidden" 
              />
              <UploadCloud className="h-10 w-10 text-gray-500 mx-auto mb-3" />
              <span className="text-sm font-bold text-gray-300 block">Drag & Drop Resume</span>
              <span className="text-xs text-gray-500 mt-1 block">Only PDF format is supported (Max 5MB)</span>
            </label>
          )}

          <div className="mt-5 space-y-3 bg-gray-900/20 p-4 rounded-xl border border-gray-800/40 text-xs">
            <h6 className="font-bold text-gray-400">AI Parser Capability</h6>
            <ul className="space-y-1.5 text-gray-500">
              <li className="flex items-center space-x-1.5">
                <CheckCircle className="h-3.5 w-3.5 text-indigo-400" />
                <span>Extracts 40+ engineering skills</span>
              </li>
              <li className="flex items-center space-x-1.5">
                <CheckCircle className="h-3.5 w-3.5 text-indigo-400" />
                <span>Calculates professional experience</span>
              </li>
              <li className="flex items-center space-x-1.5">
                <CheckCircle className="h-3.5 w-3.5 text-indigo-400" />
                <span>Maps contact info automatically</span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Profile Details Form Column */}
      <div className="lg:col-span-2">
        <form onSubmit={saveProfile} className="glass-card p-6 space-y-6 text-left">
          <h3 className="text-lg font-bold text-white border-b border-gray-800/60 pb-3 flex items-center justify-between">
            <span>Candidate Profile details</span>
            {highlighted && (
              <span className="text-xs bg-emerald-500/15 text-emerald-400 px-3 py-1 rounded-full font-bold animate-pulse">
                ✓ Parsed by LLM
              </span>
            )}
          </h3>

          {/* Grid Layout Inputs */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Name */}
            <div className="space-y-1.5">
              <label className="text-xs text-gray-400 font-semibold uppercase tracking-wider flex items-center space-x-1.5">
                <User className="h-3.5 w-3.5 text-indigo-400" />
                <span>Full Name</span>
              </label>
              <input
                type="text"
                name="name"
                value={profile.name}
                onChange={handleInputChange}
                className={`w-full bg-gray-900/40 border rounded-xl px-4 py-2.5 text-sm text-gray-200 outline-none focus:border-indigo-500 transition-all ${
                  highlighted ? "border-emerald-500/40 bg-emerald-500/5" : "border-gray-800"
                }`}
                required
              />
            </div>

            {/* Email */}
            <div className="space-y-1.5">
              <label className="text-xs text-gray-400 font-semibold uppercase tracking-wider flex items-center space-x-1.5">
                <Mail className="h-3.5 w-3.5 text-indigo-400" />
                <span>Email Address</span>
              </label>
              <input
                type="email"
                name="email"
                value={profile.email}
                onChange={handleInputChange}
                className={`w-full bg-gray-900/40 border rounded-xl px-4 py-2.5 text-sm text-gray-200 outline-none focus:border-indigo-500 transition-all ${
                  highlighted ? "border-emerald-500/40 bg-emerald-500/5" : "border-gray-800"
                }`}
                required
              />
            </div>

            {/* Phone */}
            <div className="space-y-1.5">
              <label className="text-xs text-gray-400 font-semibold uppercase tracking-wider flex items-center space-x-1.5">
                <Phone className="h-3.5 w-3.5 text-indigo-400" />
                <span>Phone Number</span>
              </label>
              <input
                type="text"
                name="phone"
                value={profile.phone}
                onChange={handleInputChange}
                className={`w-full bg-gray-900/40 border rounded-xl px-4 py-2.5 text-sm text-gray-200 outline-none focus:border-indigo-500 transition-all ${
                  highlighted ? "border-emerald-500/40 bg-emerald-500/5" : "border-gray-800"
                }`}
                required
              />
            </div>

            {/* Notice Period */}
            <div className="space-y-1.5">
              <label className="text-xs text-gray-400 font-semibold uppercase tracking-wider flex items-center space-x-1.5">
                <Clock className="h-3.5 w-3.5 text-indigo-400" />
                <span>Notice Period</span>
              </label>
              <input
                type="text"
                name="noticePeriod"
                value={profile.noticePeriod}
                onChange={handleInputChange}
                placeholder="e.g. Immediate, 15 days, 1 month"
                className="w-full bg-gray-900/40 border border-gray-800 rounded-xl px-4 py-2.5 text-sm text-gray-200 outline-none focus:border-indigo-500 transition-all"
              />
            </div>

            {/* Experience Years */}
            <div className="space-y-1.5">
              <label className="text-xs text-gray-400 font-semibold uppercase tracking-wider flex items-center space-x-1.5">
                <Briefcase className="h-3.5 w-3.5 text-indigo-400" />
                <span>Years of Experience</span>
              </label>
              <input
                type="number"
                step="0.1"
                name="experienceYears"
                value={profile.experienceYears}
                onChange={handleInputChange}
                className="w-full bg-gray-900/40 border border-gray-800 rounded-xl px-4 py-2.5 text-sm text-gray-200 outline-none focus:border-indigo-500 transition-all"
              />
            </div>

            {/* Expected CTC */}
            <div className="space-y-1.5">
              <label className="text-xs text-gray-400 font-semibold uppercase tracking-wider flex items-center space-x-1.5">
                <span>Expected CTC (INR / Year)</span>
              </label>
              <input
                type="number"
                name="expectedCtc"
                value={profile.expectedCtc}
                onChange={handleInputChange}
                placeholder="e.g. 1500000"
                className="w-full bg-gray-900/40 border border-gray-800 rounded-xl px-4 py-2.5 text-sm text-gray-200 outline-none focus:border-indigo-500 transition-all"
              />
            </div>

            {/* GitHub Profile */}
            <div className="space-y-1.5">
              <label className="text-xs text-gray-400 font-semibold uppercase tracking-wider">
                <span>GitHub URL</span>
              </label>
              <input
                type="text"
                name="githubProfile"
                value={profile.githubProfile}
                onChange={handleInputChange}
                className="w-full bg-gray-900/40 border border-gray-800 rounded-xl px-4 py-2.5 text-sm text-gray-200 outline-none focus:border-indigo-500 transition-all"
              />
            </div>

            {/* LinkedIn Profile */}
            <div className="space-y-1.5">
              <label className="text-xs text-gray-400 font-semibold uppercase tracking-wider">
                <span>LinkedIn URL</span>
              </label>
              <input
                type="text"
                name="linkedinProfile"
                value={profile.linkedinProfile}
                onChange={handleInputChange}
                className="w-full bg-gray-900/40 border border-gray-800 rounded-xl px-4 py-2.5 text-sm text-gray-200 outline-none focus:border-indigo-500 transition-all"
              />
            </div>
          </div>

          {/* Full Address */}
          <div className="space-y-1.5">
            <label className="text-xs text-gray-400 font-semibold uppercase tracking-wider flex items-center space-x-1.5">
              <MapPin className="h-3.5 w-3.5 text-indigo-400" />
              <span>Full Address</span>
            </label>
            <textarea
              name="address"
              value={profile.address}
              onChange={handleInputChange}
              rows={2}
              className="w-full bg-gray-900/40 border border-gray-800 rounded-xl px-4 py-2.5 text-sm text-gray-200 outline-none focus:border-indigo-500 transition-all resize-none"
            />
          </div>

          {/* Preferred Locations */}
          <div className="space-y-2.5">
            <label className="text-xs text-gray-400 font-semibold uppercase tracking-wider block">Preferred Cities / Locations</label>
            <div className="flex flex-wrap gap-2 mb-2">
              {profile.locations.map(loc => (
                <span key={loc} className="bg-gray-800 border border-gray-700/50 text-gray-300 px-3 py-1 rounded-full text-xs font-medium flex items-center space-x-1">
                  <span>{loc}</span>
                  <button type="button" onClick={() => removeLocation(loc)} className="text-gray-500 hover:text-white">
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
            <div className="flex space-x-2">
              <input
                type="text"
                placeholder="Add city (e.g. Pune, Remote)..."
                value={newLocation}
                onChange={e => setNewLocation(e.target.value)}
                onKeyDown={e => e.key === "Enter" && (e.preventDefault(), addLocation())}
                className="flex-1 bg-gray-900/40 border border-gray-800 rounded-xl px-3 py-2 text-xs text-gray-200 outline-none focus:border-indigo-500"
              />
              <button type="button" onClick={addLocation} className="p-2 bg-indigo-600/10 hover:bg-indigo-600 border border-indigo-500/20 text-indigo-400 hover:text-white rounded-xl">
                <Plus className="h-4.5 w-4.5" />
              </button>
            </div>
          </div>

          {/* Preferred Roles */}
          <div className="space-y-2.5">
            <label className="text-xs text-gray-400 font-semibold uppercase tracking-wider block">Target Job Roles</label>
            <div className="flex flex-wrap gap-2 mb-2">
              {profile.preferredRoles.map(role => (
                <span key={role} className="bg-gray-800 border border-gray-700/50 text-gray-300 px-3 py-1 rounded-full text-xs font-medium flex items-center space-x-1">
                  <span>{role}</span>
                  <button type="button" onClick={() => removeRole(role)} className="text-gray-500 hover:text-white">
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
            <div className="flex space-x-2">
              <input
                type="text"
                placeholder="Add role (e.g. React Developer, Backend Engineer)..."
                value={newRole}
                onChange={e => setNewRole(e.target.value)}
                onKeyDown={e => e.key === "Enter" && (e.preventDefault(), addRole())}
                className="flex-1 bg-gray-900/40 border border-gray-800 rounded-xl px-3 py-2 text-xs text-gray-200 outline-none focus:border-indigo-500"
              />
              <button type="button" onClick={addRole} className="p-2 bg-indigo-600/10 hover:bg-indigo-600 border border-indigo-500/20 text-indigo-400 hover:text-white rounded-xl">
                <Plus className="h-4.5 w-4.5" />
              </button>
            </div>
          </div>

          {/* Skills Tag Management */}
          <div className="space-y-2.5">
            <label className="text-xs text-gray-400 font-semibold uppercase tracking-wider block">Core Skills</label>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {profile.skills.map(skill => (
                <span key={skill} className="bg-indigo-950/20 border border-indigo-900/30 text-indigo-300 px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center space-x-1.5">
                  <span>{skill}</span>
                  <button type="button" onClick={() => removeSkill(skill)} className="text-indigo-400 hover:text-white">
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
            <div className="flex space-x-2">
              <input
                type="text"
                placeholder="Add skill (e.g. Node.js, Kubernetes)..."
                value={newSkill}
                onChange={e => setNewSkill(e.target.value)}
                onKeyDown={e => e.key === "Enter" && (e.preventDefault(), addSkill())}
                className="flex-1 bg-gray-900/40 border border-gray-800 rounded-xl px-3 py-2 text-xs text-gray-200 outline-none focus:border-indigo-500"
              />
              <button type="button" onClick={addSkill} className="p-2 bg-indigo-600/10 hover:bg-indigo-600 border border-indigo-500/20 text-indigo-400 hover:text-white rounded-xl">
                <Plus className="h-4.5 w-4.5" />
              </button>
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex justify-end border-t border-gray-800/60 pt-4">
            <button
              type="submit"
              className="glow-btn bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-sm px-6 py-2.5 rounded-xl shadow-lg shadow-indigo-900/25 transition-all"
            >
              Save Profile Details
            </button>
          </div>
        </form>
      </div>

    </div>
  );
}
