
export default function Home() {
  return (
    <div className="grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-screen p-8 pb-20 gap-16 sm:p-20">
      <main className="flex flex-col gap-8 row-start-2 items-center sm:items-start">
        <h1 className="text-4xl font-bold text-blue-600">Vetify</h1>
        <p className="text-xl">Your pet's health companion</p>
        <div className="grid gap-4">
          <p>Features:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Find nearby vet clinics on a map</li>
            <li>AI-powered pet health advice</li>
            <li>Contact licensed veterinarians</li>
            <li>Interactive animal anatomy</li>
            <li>Personalized meal plans</li>
          </ul>
        </div>
      </main>
    </div>
  );
}
