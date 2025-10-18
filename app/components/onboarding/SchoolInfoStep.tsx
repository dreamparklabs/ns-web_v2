import { useState, useRef, useEffect } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";

interface SchoolInfoStepProps {
  onNext: (data: { school: string; majorCategory: string; major: string; minor: string; currentYear: string }) => void;
  onBack: () => void;
  initialData: { school: string; majorCategory: string; major: string; minor: string; currentYear: string };
  isLoading: boolean;
}

export default function SchoolInfoStep({ onNext, onBack, initialData, isLoading }: SchoolInfoStepProps) {
  const [school, setSchool] = useState(initialData.school);
  const [majorCategory, setMajorCategory] = useState(initialData.majorCategory);
  const [major, setMajor] = useState(initialData.major);
  const [minor, setMinor] = useState(initialData.minor);
  const [currentYear, setCurrentYear] = useState(initialData.currentYear);
  
  // School dropdown state
  const [schoolSearch, setSchoolSearch] = useState(initialData.school);
  const [isSchoolDropdownOpen, setIsSchoolDropdownOpen] = useState(false);
  const schoolDropdownRef = useRef<HTMLDivElement>(null);

  const schools = useQuery(api.onboarding.getSchools);
  const majorCategories = useQuery(api.onboarding.getMajorCategories);

  // Sort schools alphabetically and filter based on search
  const sortedAndFilteredSchools = schools
    ?.slice()
    .sort((a, b) => a.name.localeCompare(b.name))
    .filter(school => 
      school.name.toLowerCase().includes(schoolSearch.toLowerCase()) ||
      school.city.toLowerCase().includes(schoolSearch.toLowerCase()) ||
      school.state.toLowerCase().includes(schoolSearch.toLowerCase())
    ) || [];

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (schoolDropdownRef.current && !schoolDropdownRef.current.contains(event.target as Node)) {
        setIsSchoolDropdownOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleSchoolSelect = (selectedSchool: { name: string; city: string; state: string }) => {
    const schoolDisplayName = `${selectedSchool.name} - ${selectedSchool.city}, ${selectedSchool.state}`;
    setSchool(schoolDisplayName);
    setSchoolSearch(schoolDisplayName);
    setIsSchoolDropdownOpen(false);
  };

  const yearOptions = [
    { value: "freshman", label: "Freshman" },
    { value: "sophomore", label: "Sophomore" },
    { value: "junior", label: "Junior" },
    { value: "senior", label: "Senior" },
    { value: "graduate", label: "Graduate Student" },
    { value: "other", label: "Other" },
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (school && majorCategory && major && currentYear) {
      onNext({ school, majorCategory, major, minor, currentYear });
    }
  };

  const isValid = school && majorCategory && major && currentYear;

  return (
    <div className="pt-2">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          School & Academic Information
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          Help us understand your academic background to provide relevant features.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* School */}
        <div className="relative" ref={schoolDropdownRef}>
          <label htmlFor="school" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            School <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <input
              type="text"
              id="school"
              value={schoolSearch}
              onChange={(e) => {
                setSchoolSearch(e.target.value);
                setSchool(''); // Clear selection when typing
                setIsSchoolDropdownOpen(true);
              }}
              onFocus={() => setIsSchoolDropdownOpen(true)}
              placeholder="Search for your school..."
              className="w-full px-3 py-3 lg:py-2 pr-10 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-purple-500 min-h-[44px]"
              required
            />
            <button
              type="button"
              onClick={() => setIsSchoolDropdownOpen(!isSchoolDropdownOpen)}
              className="absolute inset-y-0 right-0 flex items-center pr-3"
            >
              <svg
                className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${
                  isSchoolDropdownOpen ? 'rotate-180' : ''
                }`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          </div>
          
          {/* Dropdown */}
          {isSchoolDropdownOpen && (
            <div className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg max-h-60 overflow-y-auto">
              {sortedAndFilteredSchools.length > 0 ? (
                sortedAndFilteredSchools.map((sch) => (
                  <button
                    key={sch._id}
                    type="button"
                    onClick={() => handleSchoolSelect(sch)}
                    className="w-full px-3 py-2 text-left hover:bg-purple-50 dark:hover:bg-purple-900 focus:bg-purple-50 dark:focus:bg-purple-900 focus:outline-none text-gray-900 dark:text-white border-b border-gray-100 dark:border-gray-600 last:border-b-0"
                  >
                    <div className="font-medium">{sch.name}</div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">{sch.city}, {sch.state}</div>
                  </button>
                ))
              ) : (
                <div className="px-3 py-2 text-gray-500 dark:text-gray-400 text-center">
                  No schools found matching "{schoolSearch}"
                </div>
              )}
            </div>
          )}
        </div>

        {/* Major Category */}
        <div>
          <label htmlFor="majorCategory" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Major Category <span className="text-red-500">*</span>
          </label>
          <select
            id="majorCategory"
            value={majorCategory}
            onChange={(e) => setMajorCategory(e.target.value)}
            className="w-full px-3 py-3 lg:py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-purple-500 min-h-[44px]"
            required
          >
            <option value="">Select major category</option>
            {majorCategories?.map((cat) => (
              <option key={cat._id} value={cat.name}>
                {cat.name}
              </option>
            ))}
          </select>
        </div>

        {/* Major */}
        <div>
          <label htmlFor="major" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Major <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="major"
            value={major}
            onChange={(e) => setMajor(e.target.value)}
            placeholder="Enter your major"
            className="w-full px-3 py-3 lg:py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-purple-500 min-h-[44px]"
            required
          />
          {majorCategory && majorCategories?.find(cat => cat.name === majorCategory)?.commonMajors.length > 0 && (
            <div className="mt-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-600">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-2 font-medium">Common majors in this category:</p>
              <div className="flex flex-wrap gap-2">
                {majorCategories.find(cat => cat.name === majorCategory)?.commonMajors.map((commonMajor, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => setMajor(commonMajor)}
                    className="text-xs bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300 px-3 py-2 rounded-full hover:bg-purple-200 dark:hover:bg-purple-800 min-h-[32px] flex items-center transition-colors duration-200"
                  >
                    {commonMajor}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Minor */}
        <div>
          <label htmlFor="minor" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Minor (Optional)
          </label>
          <input
            type="text"
            id="minor"
            value={minor}
            onChange={(e) => setMinor(e.target.value)}
            placeholder="Enter your minor (if any)"
            className="w-full px-3 py-3 lg:py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-purple-500 min-h-[44px]"
          />
        </div>

        {/* Current Year */}
        <div>
          <label htmlFor="currentYear" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Current Year <span className="text-red-500">*</span>
          </label>
          <select
            id="currentYear"
            value={currentYear}
            onChange={(e) => setCurrentYear(e.target.value)}
            className="w-full px-3 py-3 lg:py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-purple-500 min-h-[44px]"
            required
          >
            <option value="">Select your current year</option>
            {yearOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
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
                Saving...
              </>
            ) : (
              "Next"
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
