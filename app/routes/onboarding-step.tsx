import { useState, useEffect, useRef } from "react";
import { useUser } from "@clerk/clerk-react";
import { useMutation, useQuery } from "convex/react";
import { useNavigate, useParams, useSearchParams } from "react-router";
import { useClerkBilling } from "../hooks/useClerkBilling";
import { api } from "../../convex/_generated/api";
import DemographicsStep from "../components/onboarding/DemographicsStep";
import SchoolInfoStep from "../components/onboarding/SchoolInfoStep";
import TermSetupStep from "../components/onboarding/TermSetupStep";
import PlanSelectionStep from "../components/onboarding/PlanSelectionStep";
import CompletionStep from "../components/onboarding/CompletionStep";
import type { Route } from "./+types/onboarding-step";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Welcome - Complete Your Setup" },
    { name: "description", content: "Complete your account setup to get started" },
  ];
}

export default function OnboardingStepPage() {
  const { user, isLoaded } = useUser();
  const navigate = useNavigate();
  const { step } = useParams();
  const [searchParams] = useSearchParams();
  const { syncSubscription } = useClerkBilling();
  const [isLoading, setIsLoading] = useState(false);
  const [loadingTimeout, setLoadingTimeout] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [isCreatingUser, setIsCreatingUser] = useState(false);
  const hasSyncedSubscription = useRef(false);

  // Parse step from URL
  const currentStep = parseInt(step || "1", 10);
  const validSteps = [1, 2, 3, 4, 5];
  
  // Redirect to step 1 if invalid step
  useEffect(() => {
    if (!validSteps.includes(currentStep)) {
      navigate("/onboarding/step/1", { replace: true });
    }
  }, [currentStep, navigate]);

  // Get user data from Convex
  const convexUser = useQuery(
    api.users.getUserByClerkId,
    user?.id ? { clerkUserId: user.id } : "skip"
  );

  // Get user's terms to check if step 3 is completed
  const userTerms = useQuery(
    api.terms.getUserTermsByClerkId,
    user?.id ? { clerkUserId: user.id } : "skip"
  );

  const createUser = useMutation(api.users.createUser);

  // Automatically create user in Convex when they arrive at onboarding
  useEffect(() => {
    const createConvexUser = async () => {
      if (isLoaded && user && !convexUser && !isCreatingUser) {
        console.log("Creating Convex user for onboarding:", user.id);
        setIsCreatingUser(true);
        try {
          await createUser({
            clerkUserId: user.id,
            email: user.emailAddresses[0]?.emailAddress || "",
            firstName: user.firstName || "",
            lastName: user.lastName || "",
          });
          console.log("Successfully created Convex user");
        } catch (error) {
          console.error("Failed to create user in Convex:", error);
          setLoadingTimeout(true);
        } finally {
          setIsCreatingUser(false);
        }
      }
    };

    createConvexUser();
  }, [isLoaded, user, convexUser, createUser, isCreatingUser]);

  // Sync subscription from Stripe when returning from checkout on step 5
  useEffect(() => {
    const checkoutStatus = searchParams.get('checkout');
    if (currentStep === 5 && checkoutStatus === 'success' && user && !hasSyncedSubscription.current) {
      hasSyncedSubscription.current = true;
      console.log('🎉 Onboarding Step 5: Checkout successful! Syncing subscription from Stripe...');

      syncSubscription().then(async () => {
        console.log('✅ Onboarding Step 5: Subscription synced from Stripe');

        // Reload user to get updated metadata
        await user.reload();
        console.log('✅ Onboarding Step 5: User reloaded with new subscription data');
      }).catch((error) => {
        console.error('❌ Onboarding Step 5: Failed to sync subscription:', error);
      });
    }
  }, [currentStep, searchParams, user, syncSubscription]);

  // Check if step is completed based on user data
  const isStep1Completed = (user: any) => {
    return user?.birthday && user?.ethnicity && user?.gender;
  };

  const isStep2Completed = (user: any) => {
    return user?.school && user?.majorCategory && user?.major && user?.currentYear;
  };

  const isStep3Completed = (terms: any[]) => {
    return terms && terms.length > 0;
  };

  // Validate step access and redirect if necessary
  useEffect(() => {
    if (!convexUser) return;

    // If user has completed ALL onboarding, redirect to dashboard
    if (convexUser.hasCompletedDemographics && convexUser.hasCompletedGuidedTour) {
      navigate("/app/v2/dashboard", { replace: true });
      return;
    }

    // Validate step access based on previous step completion
    if (currentStep === 2 && !isStep1Completed(convexUser)) {
      // Can't access step 2 without completing step 1
      navigate("/onboarding/step/1", { replace: true });
      return;
    }

    if (currentStep === 3 && (!isStep1Completed(convexUser) || !isStep2Completed(convexUser))) {
      // Can't access step 3 without completing steps 1 and 2
      if (!isStep1Completed(convexUser)) {
        navigate("/onboarding/step/1", { replace: true });
      } else {
        navigate("/onboarding/step/2", { replace: true });
      }
      return;
    }

    if (currentStep === 4 && (!isStep1Completed(convexUser) || !isStep2Completed(convexUser) || !isStep3Completed(userTerms))) {
      // Can't access step 4 without completing all previous steps
      if (!isStep1Completed(convexUser)) {
        navigate("/onboarding/step/1", { replace: true });
      } else if (!isStep2Completed(convexUser)) {
        navigate("/onboarding/step/2", { replace: true });
      } else if (!isStep3Completed(userTerms)) {
        navigate("/onboarding/step/3", { replace: true });
      }
      return;
    }

    // Step 5 (completion) is only accessible after completing checkout
    // The Stripe redirect will include checkout=success parameter
    if (currentStep === 5) {
      const urlParams = new URLSearchParams(window.location.search);
      const checkoutSuccess = urlParams.get('checkout') === 'success';
      
      // If no checkout success, redirect to step 4
      if (!checkoutSuccess) {
        navigate("/onboarding/step/4", { replace: true });
        return;
      }
    }
  }, [convexUser, userTerms, currentStep, navigate]);

  // Set a timeout for loading state
  useEffect(() => {
    if (isCreatingUser) return;

    const timer = setTimeout(() => {
      if (!convexUser) {
        setLoadingTimeout(true);
      }
    }, 10000);

    return () => clearTimeout(timer);
  }, [convexUser, retryCount, isCreatingUser]);

  const handleRetry = async () => {
    if (!user) return;

    setLoadingTimeout(false);
    setRetryCount(prev => prev + 1);
    setIsCreatingUser(true);

    try {
      await createUser({
        clerkUserId: user.id,
        email: user.emailAddresses[0]?.emailAddress || "",
        firstName: user.firstName || "",
        lastName: user.lastName || "",
      });
    } catch (error) {
      console.error("Failed to create user:", error);
      alert("Failed to create your profile. Please try again or contact support.");
    } finally {
      setIsCreatingUser(false);
    }
  };

  const updateDemographics = useMutation(api.users.updateUserDemographics);
  const updateSchoolInfo = useMutation(api.users.updateUserSchoolInfo);
  const createTerm = useMutation(api.terms.createTerm);
  const completeGuidedTour = useMutation(api.users.completeGuidedTour);
  const updateUserSubscription = useMutation(api.subscriptions.updateUserSubscription);

  // Load initial data from localStorage or use defaults
  const loadFromLocalStorage = (key: string, defaultValue: any) => {
    if (typeof window === 'undefined') return defaultValue;
    try {
      const stored = localStorage.getItem(key);
      return stored ? JSON.parse(stored) : defaultValue;
    } catch (error) {
      console.error(`Error loading ${key} from localStorage:`, error);
      return defaultValue;
    }
  };

  // Step data with Convex data or localStorage fallback
  const [demographicsData, setDemographicsData] = useState(() => {
    if (convexUser?.birthday && convexUser?.ethnicity && convexUser?.gender) {
      return {
        birthday: new Date(convexUser.birthday).toISOString().split('T')[0],
        ethnicity: convexUser.ethnicity,
        gender: convexUser.gender,
      };
    }
    return loadFromLocalStorage('onboarding_demographics', {
      birthday: "",
      ethnicity: "",
      gender: "",
    });
  });

  const [schoolData, setSchoolData] = useState(() => {
    if (convexUser?.school && convexUser?.majorCategory && convexUser?.major) {
      return {
        school: convexUser.school,
        majorCategory: convexUser.majorCategory,
        major: convexUser.major,
        minor: convexUser.minor || "",
        currentYear: convexUser.currentYear,
      };
    }
    return loadFromLocalStorage('onboarding_school', {
      school: "",
      majorCategory: "",
      major: "",
      minor: "",
      currentYear: "",
    });
  });

  const [termData, setTermData] = useState(() => {
    if (userTerms && userTerms.length > 0) {
      const latestTerm = userTerms[0]; // Assuming terms are sorted by date
      return {
        name: latestTerm.name,
        startDate: new Date(latestTerm.startDate).toISOString().split('T')[0],
        endDate: new Date(latestTerm.endDate).toISOString().split('T')[0],
      };
    }
    return loadFromLocalStorage('onboarding_term', {
      name: "",
      startDate: "",
      endDate: "",
    });
  });

  const [planData, setPlanData] = useState(() =>
    loadFromLocalStorage('onboarding_plan', {
      selectedPlan: "",
    })
  );

  // Update state when Convex data changes
  useEffect(() => {
    if (convexUser?.birthday && convexUser?.ethnicity && convexUser?.gender) {
      setDemographicsData({
        birthday: new Date(convexUser.birthday).toISOString().split('T')[0],
        ethnicity: convexUser.ethnicity,
        gender: convexUser.gender,
      });
    }
  }, [convexUser?.birthday, convexUser?.ethnicity, convexUser?.gender]);

  useEffect(() => {
    if (convexUser?.school && convexUser?.majorCategory && convexUser?.major) {
      setSchoolData({
        school: convexUser.school,
        majorCategory: convexUser.majorCategory,
        major: convexUser.major,
        minor: convexUser.minor || "",
        currentYear: convexUser.currentYear,
      });
    }
  }, [convexUser?.school, convexUser?.majorCategory, convexUser?.major, convexUser?.minor, convexUser?.currentYear]);

  useEffect(() => {
    if (userTerms && userTerms.length > 0) {
      const latestTerm = userTerms[0];
      setTermData({
        name: latestTerm.name,
        startDate: new Date(latestTerm.startDate).toISOString().split('T')[0],
        endDate: new Date(latestTerm.endDate).toISOString().split('T')[0],
      });
    }
  }, [userTerms]);

  // Save to localStorage as backup
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('onboarding_demographics', JSON.stringify(demographicsData));
      localStorage.setItem('onboarding_school', JSON.stringify(schoolData));
      localStorage.setItem('onboarding_term', JSON.stringify(termData));
      localStorage.setItem('onboarding_plan', JSON.stringify(planData));
    }
  }, [demographicsData, schoolData, termData, planData]);

  const handleDemographicsNext = async (data: typeof demographicsData) => {
    if (!convexUser?._id) return;
    
    setIsLoading(true);
    try {
      await updateDemographics({
        userId: convexUser._id,
        birthday: new Date(data.birthday).getTime(),
        ethnicity: data.ethnicity,
        gender: data.gender,
      });
      
      setDemographicsData(data);
      navigate("/onboarding/step/2");
    } catch (error) {
      console.error("Failed to update demographics:", error);
      alert("Failed to save demographic information. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSchoolInfoNext = async (data: typeof schoolData) => {
    if (!convexUser?._id) return;
    
    setIsLoading(true);
    try {
      await updateSchoolInfo({
        userId: convexUser._id,
        school: data.school,
        majorCategory: data.majorCategory,
        major: data.major,
        minor: data.minor,
        currentYear: data.currentYear,
      });
      
      setSchoolData(data);
      navigate("/onboarding/step/3");
    } catch (error) {
      console.error("Failed to update school info:", error);
      alert("Failed to save school information. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleTermSetupNext = async (data: typeof termData) => {
    if (!convexUser?._id) return;
    
    setIsLoading(true);
    try {
      const termId = await createTerm({
        userId: convexUser._id,
        name: data.name,
        startDate: data.startDate,
        endDate: data.endDate,
        status: "active",
      });
      
      if (termId) {
        setTermData(data);
        navigate("/onboarding/step/4");
      } else {
        throw new Error("Failed to create term");
      }
    } catch (error) {
      console.error("Failed to create term:", error);
      alert("There was an issue creating your term. Please try again or contact support if the problem persists.");
    } finally {
      setIsLoading(false);
    }
  };

  const handlePlanSelectionComplete = async (data: { selectedPlan: string }) => {
    setIsLoading(true);

    try {
      if (!convexUser) {
        console.error("❌ No Convex user found when trying to save plan selection");
        throw new Error("User data not available. Please refresh the page and try again.");
      }

      console.log("💾 Saving plan selection to Convex:", {
        clerkUserId: convexUser.clerkUserId,
        selectedPlan: data.selectedPlan
      });

      // Save plan selection to Convex
      await updateUserSubscription({
        clerkUserId: convexUser.clerkUserId,
        subscriptionPlan: data.selectedPlan,
        subscriptionStatus: 'pending',
        accountStatus: 'pending_payment',
      });

      console.log("✅ Plan selection saved successfully");

      // DON'T complete the guided tour yet - wait until after Stripe checkout
      // The tour will be completed when the user returns from successful checkout
      // This prevents the useEffect from navigating to dashboard before Stripe redirect

      setPlanData(data);

      // Don't clear localStorage yet - wait until after successful checkout
      // The PlanSelectionStep component will handle the Stripe checkout redirect
      // User will be redirected to Stripe immediately after this completes
    } catch (error) {
      console.error("❌ Failed to save plan selection:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
      alert(`There was an issue saving your plan selection: ${errorMessage}. Please try again or contact support if the problem persists.`);
      throw error; // Re-throw so PlanSelectionStep knows it failed
    } finally {
      setIsLoading(false);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      navigate(`/onboarding/step/${currentStep - 1}`);
    }
  };

  // Show loading if user data isn't ready
  if (!convexUser) {
    return (
      <div className="min-h-screen h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            {loadingTimeout
              ? "This is taking longer than expected..."
              : isCreatingUser
              ? "Setting up your account..."
              : "Loading your profile..."}
          </p>
          {loadingTimeout && (
            <div className="space-y-3">
              <p className="text-sm text-gray-500 dark:text-gray-500">
                We're having trouble loading your profile. This might be due to a temporary issue.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <button
                  onClick={handleRetry}
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium"
                >
                  Retry
                </button>
                <button
                  onClick={() => navigate("/app/v2/dashboard")}
                  className="px-6 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-lg transition-colors font-medium"
                >
                  Skip Setup
                </button>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-500 mt-4">
                If the problem persists, please contact{" "}
                <a href="mailto:support@dreampark.dev" className="text-blue-600 hover:underline">
                  support@dreampark.dev
                </a>
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen h-screen bg-gradient-to-br from-white to-purple-50 dark:from-gray-900 dark:to-purple-950 flex flex-col lg:flex-row pt-4 lg:pt-0">
      {/* Left Side - Header & Progress */}
      <div className="w-full lg:w-1/2 flex flex-col justify-center px-6 py-8 lg:px-12 lg:py-0">
        <div className="space-y-6 lg:space-y-8">
          {/* Header */}
          <div className="text-center lg:text-left">
            <div className="mb-4 lg:mb-6 flex justify-center lg:justify-start">
              <img 
                src="/logo-light.png" 
                alt="Northstar Logo" 
                className="h-12 lg:h-16 w-auto dark:hidden"
              />
              <img 
                src="/logo-dark.png" 
                alt="Northstar Logo" 
                className="h-12 lg:h-16 w-auto hidden dark:block"
              />
            </div>
            <h1 className="text-3xl lg:text-4xl font-bold text-gray-900 dark:text-white mb-3 lg:mb-4">
              Welcome to Northstar!
            </h1>
            <p className="text-base lg:text-lg text-gray-600 dark:text-gray-400 leading-relaxed">
              Let's get your account set up so you can start managing your academic life effectively.
            </p>
          </div>

          {/* Progress indicator */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Step {currentStep} of 5
              </span>
              <span className="text-sm font-semibold text-purple-600 dark:text-purple-400">
                {currentStep === 1 && "Demographics"}
                {currentStep === 2 && "School Information"}
                {currentStep === 3 && "Term Setup"}
                {currentStep === 4 && "Plan Selection"}
                {currentStep === 5 && "Complete"}
              </span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
              <div
                className="bg-gradient-to-r from-purple-500 to-purple-600 h-3 rounded-full transition-all duration-500 ease-out"
                style={{ width: `${(currentStep / 5) * 100}%` }}
              />
            </div>
            
            {/* Step indicators */}
            <div className="flex justify-between mt-4">
              <div className={`flex items-center space-x-1 ${currentStep >= 1 ? 'text-purple-600 dark:text-purple-400' : 'text-gray-400'}`}>
                <div className={`w-3 h-3 rounded-full ${currentStep >= 1 ? 'bg-purple-600' : 'bg-gray-300'}`}></div>
                <span className="text-xs font-medium">Demographics</span>
              </div>
              <div className={`flex items-center space-x-1 ${currentStep >= 2 ? 'text-purple-600 dark:text-purple-400' : 'text-gray-400'}`}>
                <div className={`w-3 h-3 rounded-full ${currentStep >= 2 ? 'bg-purple-600' : 'bg-gray-300'}`}></div>
                <span className="text-xs font-medium">School</span>
              </div>
              <div className={`flex items-center space-x-1 ${currentStep >= 3 ? 'text-purple-600 dark:text-purple-400' : 'text-gray-400'}`}>
                <div className={`w-3 h-3 rounded-full ${currentStep >= 3 ? 'bg-purple-600' : 'bg-gray-300'}`}></div>
                <span className="text-xs font-medium">Term</span>
              </div>
              <div className={`flex items-center space-x-1 ${currentStep >= 4 ? 'text-purple-600 dark:text-purple-400' : 'text-gray-400'}`}>
                <div className={`w-3 h-3 rounded-full ${currentStep >= 4 ? 'bg-purple-600' : 'bg-gray-300'}`}></div>
                <span className="text-xs font-medium">Plan</span>
              </div>
              <div className={`flex items-center space-x-1 ${currentStep >= 5 ? 'text-purple-600 dark:text-purple-400' : 'text-gray-400'}`}>
                <div className={`w-3 h-3 rounded-full ${currentStep >= 5 ? 'bg-purple-600' : 'bg-gray-300'}`}></div>
                <span className="text-xs font-medium">Done</span>
              </div>
            </div>
          </div>

          {/* Footer - Hidden on mobile, shown on desktop */}
          <div className="hidden lg:block">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Need help? Contact support at{" "}
              <a href="mailto:support@dreampark.dev" className="text-purple-600 dark:text-purple-400 hover:underline">
                support@dreampark.dev
              </a>
            </p>
          </div>
        </div>
      </div>

      {/* Right Side - Form Content */}
      <div className="w-full lg:w-1/2 flex items-start justify-center p-6 lg:p-12 overflow-y-auto pt-8 lg:pt-12">
        <div className="w-full max-w-lg bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 lg:p-8">
          {/* Step content */}
          {currentStep === 1 && (
            <DemographicsStep
              onNext={handleDemographicsNext}
              onChange={setDemographicsData}
              initialData={demographicsData}
              isLoading={isLoading}
            />
          )}

          {currentStep === 2 && (
            <SchoolInfoStep
              onNext={handleSchoolInfoNext}
              onBack={handleBack}
              onChange={setSchoolData}
              initialData={schoolData}
              isLoading={isLoading}
            />
          )}

          {currentStep === 3 && (
            <TermSetupStep
              onComplete={handleTermSetupNext}
              onBack={handleBack}
              onChange={setTermData}
              initialData={termData}
              isLoading={isLoading}
            />
          )}

          {currentStep === 4 && (
            <PlanSelectionStep
              onComplete={handlePlanSelectionComplete}
              onBack={handleBack}
              initialData={planData}
              isLoading={isLoading}
            />
          )}

          {currentStep === 5 && (
            <CompletionStep
              onComplete={async () => {
                try {
                  // Complete the guided tour
                  if (convexUser && !convexUser.hasCompletedGuidedTour) {
                    await completeGuidedTour({ userId: convexUser._id });
                    console.log('✅ Guided tour completed');
                  }

                  // Clear onboarding localStorage
                  if (typeof window !== 'undefined') {
                    localStorage.removeItem('onboarding_demographics');
                    localStorage.removeItem('onboarding_school');
                    localStorage.removeItem('onboarding_term');
                    localStorage.removeItem('onboarding_plan');
                  }

                  // Navigate to dashboard
                  navigate("/app/v2/dashboard");
                } catch (error) {
                  console.error('Failed to complete onboarding:', error);
                  // Navigate anyway
                  navigate("/app/v2/dashboard");
                }
              }}
            />
          )}
        </div>
      </div>

      {/* Footer - Shown on mobile, hidden on desktop */}
      <div className="lg:hidden px-6 pb-6 text-center">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Need help? Contact support at{" "}
          <a href="mailto:support@dreampark.dev" className="text-purple-600 dark:text-purple-400 hover:underline">
            support@dreampark.dev
          </a>
        </p>
      </div>
    </div>
  );
}
