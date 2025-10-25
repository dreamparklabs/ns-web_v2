import { useState, useEffect } from "react";

interface TermSetupStepProps {
  onComplete: (data: { name: string; startDate: string; endDate: string }) => void;
  onBack: () => void;
  onChange?: (data: { name: string; startDate: string; endDate: string }) => void;
  initialData: { name: string; startDate: string; endDate: string };
  isLoading: boolean;
}

export default function TermSetupStep({ onComplete, onBack, onChange, initialData, isLoading }: TermSetupStepProps) {
  const [name, setName] = useState(initialData.name);
  const [startDate, setStartDate] = useState(initialData.startDate);
  const [endDate, setEndDate] = useState(initialData.endDate);

  // Sync form data with parent component in real-time
  useEffect(() => {
    onChange?.({ name, startDate, endDate });
  }, [name, startDate, endDate, onChange]);

  const termSuggestions = [
    "Fall 2024",
    "Spring 2025",
    "Summer 2025",
    "Fall 2025",
    "Winter 2025",
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name && startDate && endDate) {
      onComplete({ name, startDate, endDate });
    }
  };

  const isValid = name && startDate && endDate && new Date(startDate) < new Date(endDate);

  // Set suggested dates based on term name
  const handleTermSuggestion = (termName: string) => {
    setName(termName);
    
    // Auto-suggest dates based on term name
    const year = termName.match(/\d{4}/)?.[0] || "2024";
    const season = termName.toLowerCase();
    
    if (season.includes("fall")) {
      setStartDate(`${year}-08-15`);
      setEndDate(`${year}-12-15`);
    } else if (season.includes("spring")) {
      setStartDate(`${year}-01-15`);
      setEndDate(`${year}-05-15`);
    } else if (season.includes("summer")) {
      setStartDate(`${year}-05-15`);
      setEndDate(`${year}-08-15`);
    } else if (season.includes("winter")) {
      setStartDate(`${year}-12-15`);
      const nextYear = (parseInt(year) + 1).toString();
      setEndDate(`${nextYear}-01-15`);
    }
  };

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Set up your first term
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          Create your first academic term to start organizing your courses and assignments.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Term Name */}
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Term Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., Fall 2024, Spring 2025"
            className="w-full px-3 py-3 lg:py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-purple-500 min-h-[44px]"
            required
          />
          
          {/* Term suggestions */}
          <div className="mt-2">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Quick suggestions:</p>
            <div className="flex flex-wrap gap-2">
              {termSuggestions.map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  onClick={() => handleTermSuggestion(suggestion)}
                  className="text-xs bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300 px-3 py-2 rounded hover:bg-purple-200 dark:hover:bg-purple-800 min-h-[36px] flex items-center"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Start Date */}
        <div>
          <label htmlFor="startDate" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Start Date <span className="text-red-500">*</span>
          </label>
          <input
            type="date"
            id="startDate"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-full px-3 py-3 lg:py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-purple-500 min-h-[44px]"
            required
          />
        </div>

        {/* End Date */}
        <div>
          <label htmlFor="endDate" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            End Date <span className="text-red-500">*</span>
          </label>
          <input
            type="date"
            id="endDate"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            min={startDate}
            className="w-full px-3 py-3 lg:py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-purple-500 min-h-[44px]"
            required
          />
          {startDate && endDate && new Date(startDate) >= new Date(endDate) && (
            <p className="text-red-500 text-xs mt-1">End date must be after start date</p>
          )}
        </div>

        {/* Info box */}
        <div className="bg-blue-50 dark:bg-blue-900 border border-blue-200 dark:border-blue-700 rounded-lg p-4">
          <div className="flex">
            <svg className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <h3 className="text-sm font-medium text-blue-800 dark:text-blue-200">What's a term?</h3>
              <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                A term represents a semester, quarter, or any period where you take classes. You can add your courses and assignments to this term once it's created.
              </p>
            </div>
          </div>
        </div>

        {/* Navigation buttons */}
        <div className="flex flex-col sm:flex-row justify-between gap-3 sm:gap-0 pt-6">
          <button
            type="button"
            onClick={onBack}
            className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-6 py-3 lg:py-2 rounded-full font-medium transition duration-200 min-h-[44px] w-full sm:w-auto"
          >
            Back
          </button>
          <button
            type="submit"
            disabled={!isValid || isLoading}
            className="bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 disabled:bg-gray-400 text-white px-6 py-3 lg:py-2 rounded-full font-medium transition duration-200 flex items-center min-h-[44px] w-full sm:w-auto justify-center"
          >
            {isLoading ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Creating...
              </>
            ) : (
              "Complete Setup"
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
