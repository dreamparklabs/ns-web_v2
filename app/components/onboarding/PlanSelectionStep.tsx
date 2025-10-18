import { useState } from "react";

interface PlanSelectionStepProps {
  onComplete: (data: { selectedPlan: string }) => void;
  onBack: () => void;
  initialData: { selectedPlan: string };
  isLoading: boolean;
}

export default function PlanSelectionStep({ onComplete, onBack, initialData, isLoading }: PlanSelectionStepProps) {
  const [selectedPlan, setSelectedPlan] = useState(initialData.selectedPlan);

  const plans = [
    {
      id: "free",
      name: "Free",
      price: "$0",
      period: "forever",
      description: "Perfect for getting started",
      features: [
        "1GB file storage",
        "2 shared file links",
        "Basic academic tracking",
        "Email support"
      ],
      popular: false
    },
    {
      id: "northstar_basic",
      name: "Northstar Basic",
      price: "$9.99",
      period: "per month",
      description: "Great for most students",
      features: [
        "1GB file storage",
        "2 shared file links",
        "2 academic terms",
        "Basic analytics",
        "Priority support"
      ],
      popular: true
    },
    {
      id: "northstar_pro",
      name: "Northstar Pro",
      price: "$19.99",
      period: "per month",
      description: "For serious students",
      features: [
        "Unlimited file storage",
        "Unlimited shared links",
        "Unlimited academic terms",
        "Advanced analytics",
        "Academic progress insights",
        "Priority support"
      ],
      popular: false
    }
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedPlan) {
      onComplete({ selectedPlan });
    }
  };

  const isValid = selectedPlan;

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Choose Your Plan
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          Select the plan that best fits your academic needs. You can always upgrade or downgrade later.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Plan Selection */}
        <div className="space-y-4">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className={`relative border-2 rounded-xl p-6 cursor-pointer transition-all duration-200 ${
                selectedPlan === plan.id
                  ? 'border-purple-500 bg-purple-50 dark:bg-purple-900 dark:bg-opacity-20'
                  : 'border-gray-200 dark:border-gray-600 hover:border-purple-300 dark:hover:border-purple-700'
              }`}
              onClick={() => setSelectedPlan(plan.id)}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-6">
                  <span className="bg-purple-600 text-white text-xs font-semibold px-3 py-1 rounded-full">
                    Most Popular
                  </span>
                </div>
              )}
              
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <input
                      type="radio"
                      name="plan"
                      value={plan.id}
                      checked={selectedPlan === plan.id}
                      onChange={() => setSelectedPlan(plan.id)}
                      className="w-4 h-4 text-purple-600 border-gray-300 focus:ring-purple-500"
                    />
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      {plan.name}
                    </h3>
                  </div>
                  
                  <div className="ml-7">
                    <div className="flex items-baseline space-x-1 mb-2">
                      <span className="text-3xl font-bold text-gray-900 dark:text-white">
                        {plan.price}
                      </span>
                      <span className="text-gray-600 dark:text-gray-400">
                        {plan.period}
                      </span>
                    </div>
                    
                    <p className="text-gray-600 dark:text-gray-400 mb-4">
                      {plan.description}
                    </p>
                    
                    <ul className="space-y-2">
                      {plan.features.map((feature, index) => (
                        <li key={index} className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                          <svg className="w-4 h-4 text-green-500 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          {feature}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          ))}
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
                Setting up...
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
