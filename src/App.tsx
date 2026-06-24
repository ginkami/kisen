import { useQuery } from '@tanstack/react-query'

// Simulated API response shape.
interface Greeting {
  title: string
  message: string
}

// Fake async fetch that resolves after one second.
function fetchGreeting(): Promise<Greeting> {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        title: 'Hello, Vite + React + Tailwind!',
        message:
          'This page is powered by TanStack Query v5 and styled with Tailwind CSS v4.',
      })
    }, 1000)
  })
}

function App() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['greeting'],
    queryFn: fetchGreeting,
  })

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 to-slate-200 p-6 text-slate-800">
      <section className="w-full max-w-md rounded-2xl bg-white p-8 shadow-xl">
        <h1 className="mb-2 text-2xl font-bold tracking-tight">
          TanStack Query Demo
        </h1>
        <p className="mb-6 text-sm text-slate-500">
          A simple test page to verify Tailwind CSS and TanStack Query setup.
        </p>

        <div className="rounded-xl border border-slate-100 bg-slate-50 p-6">
          {isLoading && (
            <p className="text-center font-medium text-indigo-600">Loading...</p>
          )}

          {isError && (
            <p className="text-center font-medium text-red-500">
              Something went wrong.
            </p>
          )}

          {data && (
            <div className="space-y-2">
              <h2 className="text-lg font-semibold text-indigo-700">
                {data.title}
              </h2>
              <p className="leading-relaxed text-slate-600">{data.message}</p>
            </div>
          )}
        </div>
      </section>
    </main>
  )
}

export default App
