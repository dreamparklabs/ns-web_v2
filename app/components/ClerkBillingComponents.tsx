import React from 'react';
import { useTranslation } from '../contexts/LanguageContext';

interface PricingTableProps {
  className?: string;
}

export function PricingTable({ className = '' }: PricingTableProps) {
  const t = useTranslation();
  
  return (
    <div className={`max-w-4xl mx-auto ${className}`}>
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
          {t('ui.chooseYourPlan')}
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          {t('ui.selectPlanDesc')}
        </p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Free Plan */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-6">
          <div className="text-center">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
              {t('settings.billing.plans.free.name')}
            </h3>
            <div className="mb-4">
              <span className="text-4xl font-bold text-gray-900 dark:text-white">
                {t('settings.billing.plans.free.price')}
              </span>
              <span className="text-gray-500 dark:text-gray-400 ml-1">
                {t('settings.billing.plans.free.period')}
              </span>
            </div>
            
            <div className="space-y-3 mb-6">
              {(t('settings.billing.plans.free.features') as unknown as string[]).map((feature, index) => (
                <div key={index} className="flex items-center">
                  <svg className="w-5 h-5 text-green-500 mr-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  <span className="text-gray-700 dark:text-gray-300">{feature}</span>
                </div>
              ))}
            </div>
            
            <button className="w-full bg-gray-600 hover:bg-gray-700 text-white py-2 px-4 rounded-lg font-medium transition-colors">
              {t('ui.currentPlan')}
            </button>
          </div>
        </div>

        {/* Student Pro Plan */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg border-2 border-purple-500 p-6 relative">
          <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
            <span className="bg-purple-500 text-white px-3 py-1 rounded-full text-sm font-medium">
              {t('ui.mostPopular')}
            </span>
          </div>
          
          <div className="text-center">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
              {t('settings.billing.plans.studentPro.name')}
            </h3>
            <div className="mb-4">
              <span className="text-4xl font-bold text-gray-900 dark:text-white">
                {t('settings.billing.plans.studentPro.price')}
              </span>
              <span className="text-gray-500 dark:text-gray-400 ml-1">
                {t('settings.billing.plans.studentPro.period')}
              </span>
              <div className="mt-1">
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {t('settings.billing.plans.studentPro.annualPrice')}
                </span>
              </div>
              <div className="mt-1">
                <span className="text-sm text-green-600 dark:text-green-400 font-medium">
                  {t('settings.billing.plans.studentPro.trialDays')}
                </span>
              </div>
            </div>
            
            <div className="space-y-3 mb-6">
              {(t('settings.billing.plans.studentPro.features') as unknown as string[]).map((feature, index) => (
                <div key={index} className="flex items-center">
                  <svg className="w-5 h-5 text-green-500 mr-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  <span className="text-gray-700 dark:text-gray-300">{feature}</span>
                </div>
              ))}
            </div>
            
            <button className="w-full bg-purple-600 hover:bg-purple-700 text-white py-2 px-4 rounded-lg font-medium transition-colors">
              {t('ui.subscribeToStudentPro')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}




