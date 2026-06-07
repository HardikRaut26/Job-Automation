import { useState, useEffect } from "react";
import { Bar, Doughnut } from "react-chartjs-2";
import { 
  Chart as ChartJS, 
  CategoryScale, 
  LinearScale, 
  BarElement, 
  Title, 
  Tooltip, 
  Legend, 
  ArcElement 
} from "chart.js";
import { 
  Briefcase, 
  Send, 
  Calendar, 
  Award, 
  TrendingUp, 
  MapPin 
} from "lucide-react";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

const BACKEND_URL = "http://localhost:5000";

interface StatsData {
  totalFound: number;
  totalApplied: number;
  interviews: number;
  rejections: number;
  offers: number;
  successRate: number;
  statusBreakdown: Record<string, number>;
  portalsData: Record<string, number>;
  locationsData: Record<string, number>;
  skillsDemand: Record<string, number>;
}

export default function Dashboard() {
  const [stats, setStats] = useState<StatsData>({
    totalFound: 0,
    totalApplied: 0,
    interviews: 0,
    rejections: 0,
    offers: 0,
    successRate: 0,
    statusBreakdown: {},
    portalsData: {},
    locationsData: {},
    skillsDemand: {}
  });
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    fetch(`${BACKEND_URL}/api/stats`)
      .then(res => res.json())
      .then(data => {
        setStats(data);
        setLoading(false);
      })
      .catch(err => {
        console.error("Error loading dashboard stats:", err);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  // Prepare Portal Bar Chart Data
  const portals = Object.keys(stats.portalsData || {});
  const portalCounts = Object.values(stats.portalsData || {});
  
  const barChartData = {
    labels: portals.length > 0 ? portals : ["Indeed", "LinkedIn", "Internshala"],
    datasets: [
      {
        label: "Jobs Scraped",
        data: portalCounts.length > 0 ? portalCounts : [0, 0, 0],
        backgroundColor: "rgba(99, 102, 241, 0.65)",
        borderColor: "rgba(99, 102, 241, 1)",
        borderWidth: 1,
        borderRadius: 6,
      }
    ]
  };

  // Prepare Location Doughnut Chart Data
  const locations = Object.keys(stats.locationsData || {});
  const locationCounts = Object.values(stats.locationsData || {});

  const doughnutChartData = {
    labels: locations.length > 0 ? locations : ["Remote", "Bangalore", "Pune"],
    datasets: [
      {
        data: locationCounts.length > 0 ? locationCounts : [1, 0, 0],
        backgroundColor: [
          "rgba(99, 102, 241, 0.7)",
          "rgba(168, 85, 247, 0.7)",
          "rgba(236, 72, 153, 0.7)",
          "rgba(16, 185, 129, 0.7)",
        ],
        borderColor: "rgba(255, 255, 255, 0.05)",
        borderWidth: 1
      }
    ]
  };

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        labels: { color: "#9ca3af", font: { family: "Inter" } }
      }
    },
    scales: {
      x: { grid: { color: "rgba(255,255,255,0.03)" }, ticks: { color: "#9ca3af" } },
      y: { grid: { color: "rgba(255,255,255,0.03)" }, ticks: { color: "#9ca3af", stepSize: 1 } }
    }
  };

  return (
    <div className="space-y-6">
      {/* Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
        {/* Metric 1 */}
        <div className="glass-card p-5 relative overflow-hidden flex items-center justify-between border-l-4 border-l-blue-500">
          <div>
            <span className="text-xs text-gray-400 font-semibold uppercase tracking-wider block">Jobs Discovered</span>
            <span className="text-3xl font-extrabold text-white mt-1 block">{stats.totalFound}</span>
          </div>
          <div className="p-3 bg-blue-500/10 rounded-xl text-blue-400">
            <Briefcase className="h-6 w-6" />
          </div>
        </div>

        {/* Metric 2 */}
        <div className="glass-card p-5 relative overflow-hidden flex items-center justify-between border-l-4 border-l-purple-500">
          <div>
            <span className="text-xs text-gray-400 font-semibold uppercase tracking-wider block">Applications Filed</span>
            <span className="text-3xl font-extrabold text-white mt-1 block">{stats.totalApplied}</span>
          </div>
          <div className="p-3 bg-purple-500/10 rounded-xl text-purple-400">
            <Send className="h-6 w-6" />
          </div>
        </div>

        {/* Metric 3 */}
        <div className="glass-card p-5 relative overflow-hidden flex items-center justify-between border-l-4 border-l-amber-500">
          <div>
            <span className="text-xs text-gray-400 font-semibold uppercase tracking-wider block">Interviews Arranged</span>
            <span className="text-3xl font-extrabold text-white mt-1 block">{stats.interviews}</span>
          </div>
          <div className="p-3 bg-amber-500/10 rounded-xl text-amber-400">
            <Calendar className="h-6 w-6" />
          </div>
        </div>

        {/* Metric 4 */}
        <div className="glass-card p-5 relative overflow-hidden flex items-center justify-between border-l-4 border-l-emerald-500">
          <div>
            <span className="text-xs text-gray-400 font-semibold uppercase tracking-wider block">Success Rate</span>
            <span className="text-3xl font-extrabold text-white mt-1 block">{stats.successRate}%</span>
          </div>
          <div className="p-3 bg-emerald-500/10 rounded-xl text-emerald-400">
            <Award className="h-6 w-6" />
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="glass-card p-6">
          <h3 className="text-lg font-bold text-white mb-4 flex items-center space-x-2">
            <TrendingUp className="h-5 w-5 text-indigo-400" />
            <span>Applications by Portal</span>
          </h3>
          <div className="h-64 flex items-center justify-center">
            <Bar data={barChartData} options={chartOptions} />
          </div>
        </div>

        <div className="glass-card p-6">
          <h3 className="text-lg font-bold text-white mb-4 flex items-center space-x-2">
            <MapPin className="h-5 w-5 text-purple-400" />
            <span>Applications by Location</span>
          </h3>
          <div className="h-64 flex items-center justify-center">
            <Doughnut 
              data={doughnutChartData} 
              options={{
                responsive: true,
                plugins: {
                  legend: {
                    position: "right" as const,
                    labels: { color: "#9ca3af", font: { family: "Inter" } }
                  }
                }
              }} 
            />
          </div>
        </div>
      </div>

      {/* Analytics Insights */}
      <div className="glass-card p-6">
        <h3 className="text-lg font-bold text-white mb-4">Market Demand Skill Analysis</h3>
        {Object.keys(stats.skillsDemand).length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Object.entries(stats.skillsDemand)
              .sort((a, b) => b[1] - a[1])
              .slice(0, 8)
              .map(([skill, count]) => (
                <div key={skill} className="bg-gray-800/40 p-4 rounded-xl border border-gray-700/30 flex items-center justify-between">
                  <div>
                    <span className="font-semibold text-gray-200">{skill}</span>
                    <span className="block text-xs text-gray-500">Requested in {count} matches</span>
                  </div>
                  <span className="text-indigo-400 bg-indigo-500/10 px-2 py-1 rounded-md text-xs font-bold font-mono">
                    +{Math.round((count / Math.max(1, stats.totalFound)) * 100)}%
                  </span>
                </div>
              ))}
          </div>
        ) : (
          <div className="text-center py-6 text-gray-500 text-sm">
            Discover jobs to compile and analyze local market skill demands automatically.
          </div>
        )}
      </div>
    </div>
  );
}
