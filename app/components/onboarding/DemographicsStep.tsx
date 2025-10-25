import { useState, useEffect } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";

interface DemographicsStepProps {
  onNext: (data: { birthday: string; ethnicity: string; gender: string }) => void;
  onChange?: (data: { birthday: string; ethnicity: string; gender: string }) => void;
  initialData: { birthday: string; ethnicity: string; gender: string };
  isLoading: boolean;
}

export default function DemographicsStep({ onNext, onChange, initialData, isLoading }: DemographicsStepProps) {
  const [birthday, setBirthday] = useState(initialData.birthday);
  const [ethnicity, setEthnicity] = useState(initialData.ethnicity);
  const [gender, setGender] = useState(initialData.gender);

  // Sync form data with parent component in real-time
  useEffect(() => {
    onChange?.({ birthday, ethnicity, gender });
  }, [birthday, ethnicity, gender, onChange]);

  const ethnicities = useQuery(api.onboarding.getEthnicities);

  const genderOptions = [
    { value: "male", label: "Male" },
    { value: "female", label: "Female" },
    { value: "non-binary", label: "Non-binary" },
    { value: "prefer-not-to-say", label: "Prefer not to say" },
    { value: "other", label: "Other" },
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (birthday && ethnicity && gender) {
      onNext({ birthday, ethnicity, gender });
    }
  };

  const isValid = birthday && ethnicity && gender;

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Tell us about yourself
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          This information helps us personalize your experience and provide better insights.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Birthday */}
        <div>
          <label htmlFor="birthday" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Birthday <span className="text-red-500">*</span>
          </label>
          <input
            type="date"
            id="birthday"
            value={birthday}
            onChange={(e) => setBirthday(e.target.value)}
            className="w-full px-3 py-3 lg:py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-purple-500 min-h-[44px]"
            required
          />
        </div>

        {/* Ethnicity */}
        <div>
          <label htmlFor="ethnicity" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Ethnicity <span className="text-red-500">*</span>
          </label>
          <select
            id="ethnicity"
            value={ethnicity}
            onChange={(e) => setEthnicity(e.target.value)}
            className="w-full px-3 py-3 lg:py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-purple-500 min-h-[44px]"
            required
          >
            <option value="">Select your ethnicity</option>
            {ethnicities?.map((eth) => (
              <option key={eth._id} value={eth.name}>
                {eth.name}
              </option>
            ))}
          </select>
        </div>

        {/* Gender */}
        <div>
          <label htmlFor="gender" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Gender <span className="text-red-500">*</span>
          </label>
          <select
            id="gender"
            value={gender}
            onChange={(e) => setGender(e.target.value)}
            className="w-full px-3 py-3 lg:py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-purple-500 min-h-[44px]"
            required
          >
            <option value="">Select your gender</option>
            {genderOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        {/* Submit button */}
        <div className="flex justify-end pt-6">
          <button
            type="submit"
            disabled={!isValid || isLoading}
            className="bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 disabled:bg-gray-400 text-white px-6 py-3 lg:py-2 rounded-full font-medium transition duration-200 flex items-center min-h-[44px]"
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
