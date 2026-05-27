import { getMe } from "@/lib/actions/auth.actions";

export default async function DashboardPage() {
  const user = await getMe();

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">
          Welcome back{user?.full_name ? `, ${user.full_name.split(" ")[0]}` : ""}
        </h1>
        <p className="text-gray-400 mt-1 text-sm">
          Here's what's happening with your data today.
        </p>
      </div>

      {/* Empty state */}
      <div className="flex flex-col items-center justify-center min-h-[400px] border border-dashed border-gray-800 rounded-2xl">
        <div className="inline-flex items-center justify-center w-14 h-14 bg-indigo-600/10 border border-indigo-600/20 rounded-xl mb-4">
          <svg className="w-7 h-7 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        </div>
        <h3 className="text-white font-semibold mb-1">No dashboards yet</h3>
        <p className="text-gray-500 text-sm text-center max-w-xs">
          Upload a dataset to get started with your first visualization.
        </p>
        <button className="mt-6 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-5 py-2.5 rounded-lg transition-colors">
          Upload Dataset
        </button>
      </div>
    </div>
  );
}