function ComingSoon({ title }) {
  return (
    <div className="flex flex-col items-center justify-center h-[60vh] text-center">
      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white text-2xl mb-4">✨</div>
      <h2 className="text-xl font-semibold text-gray-700">{title}</h2>
      <p className="text-gray-400 text-sm mt-1">Coming up in the next phase</p>
    </div>
  )
}

export default ComingSoon