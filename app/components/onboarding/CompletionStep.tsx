import { motion } from "framer-motion";
import { CheckCircle, Sparkles, ArrowRight } from "lucide-react";
import { useUser } from "@clerk/clerk-react";
import { useClerkBilling } from "../../hooks/useClerkBilling";
import { useEffect, useState } from "react";

interface CompletionStepProps {
  onComplete: () => void;
}

export default function CompletionStep({ onComplete }: CompletionStepProps) {
  const { user } = useUser();
  const { getCurrentPlan } = useClerkBilling();
  const planInfo = getCurrentPlan();
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);

  // Get the plan from localStorage (what user selected) or from Clerk (after sync)
  useEffect(() => {
    // Try to get from localStorage first
    const storedPlan = localStorage.getItem('onboarding_plan');
    if (storedPlan) {
      try {
        const planData = JSON.parse(storedPlan);
        setSelectedPlan(planData.selectedPlan);
      } catch (e) {
        console.error('Failed to parse stored plan:', e);
      }
    }
    // Otherwise use what's synced from Clerk
    if (!storedPlan && planInfo.currentPlan) {
      setSelectedPlan(planInfo.currentPlan);
    }
  }, [planInfo.currentPlan]);

  const getPlanDisplayName = (plan: string | null) => {
    if (plan === 'northstar_pro') return 'Northstar Pro';
    if (plan === 'northstar_basic') return 'Northstar Basic';
    return 'Free';
  };

  // Use selected plan if available, otherwise fall back to synced plan
  const displayPlan = selectedPlan || planInfo.currentPlan;

  return (
    <div className="max-w-2xl mx-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 md:p-12 text-center"
      >
        {/* Success Icon */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
          className="mb-6"
        >
          <div className="relative inline-block">
            <CheckCircle className="w-24 h-24 text-green-500 mx-auto" />
            <motion.div
              animate={{ 
                rotate: 360,
                scale: [1, 1.2, 1]
              }}
              transition={{ 
                duration: 2,
                repeat: Infinity,
                repeatDelay: 1
              }}
              className="absolute -top-2 -right-2"
            >
              <Sparkles className="w-8 h-8 text-purple-500" />
            </motion.div>
          </div>
        </motion.div>

        {/* Heading */}
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4"
        >
          Welcome to Northstar! 🎉
        </motion.h1>

        {/* Subheading */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="text-lg text-gray-600 dark:text-gray-300 mb-8"
        >
          You've successfully completed the onboarding process!
        </motion.p>

        {/* Subscription Info Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 rounded-xl p-6 mb-8 border border-purple-200 dark:border-purple-800"
        >
          <div className="flex items-center justify-center mb-3">
            <div className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></div>
            <span className="text-sm font-medium text-gray-600 dark:text-gray-300">
              Subscription Active
            </span>
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            {getPlanDisplayName(displayPlan)}
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            You now have access to all {displayPlan === 'northstar_pro' ? 'Pro' : displayPlan === 'northstar_basic' ? 'Basic' : 'Free'} features
          </p>
        </motion.div>

        {/* Features List */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="text-left mb-8 space-y-3"
        >
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 text-center">
            What's next?
          </h3>
          <div className="space-y-2">
            <div className="flex items-start">
              <CheckCircle className="w-5 h-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" />
              <p className="text-gray-700 dark:text-gray-300">
                Access your personalized dashboard
              </p>
            </div>
            <div className="flex items-start">
              <CheckCircle className="w-5 h-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" />
              <p className="text-gray-700 dark:text-gray-300">
                Connect your classes and start tracking assignments
              </p>
            </div>
            <div className="flex items-start">
              <CheckCircle className="w-5 h-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" />
              <p className="text-gray-700 dark:text-gray-300">
                Explore AI-powered study tools and insights
              </p>
            </div>
          </div>
        </motion.div>

        {/* Continue Button */}
        <motion.button
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          onClick={onComplete}
          className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-semibold py-4 px-8 rounded-xl transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98] shadow-lg hover:shadow-xl flex items-center justify-center group"
        >
          Continue to Dashboard
          <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
        </motion.button>

        {/* Footer Text */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="mt-6 text-sm text-gray-500 dark:text-gray-400"
        >
          Need help getting started? Visit our{" "}
          <a href="#" className="text-purple-600 dark:text-purple-400 hover:underline">
            Help Center
          </a>
        </motion.p>
      </motion.div>
    </div>
  );
}
