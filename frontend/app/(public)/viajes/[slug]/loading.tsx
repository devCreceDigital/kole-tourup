export default function Loading() {
  return (
    <div className="min-h-screen bg-white">
      <div className="w-full h-[70vh] bg-gray-200 animate-pulse" />
      <div className="py-8 px-6 bg-gray-50">
        <div className="max-w-4xl mx-auto grid grid-cols-4 gap-6">
          {[1,2,3,4].map(i => <div key={i} className="h-16 bg-gray-200 rounded animate-pulse" />)}
        </div>
      </div>
      <div className="py-12 px-6 max-w-4xl mx-auto space-y-4">
        {[1,2,3].map(i => <div key={i} className="h-12 bg-gray-200 rounded animate-pulse" />)}
      </div>
    </div>
  )
}