'use client';

import React, { useState, useEffect } from 'react';
import { trackPerformance } from '@/lib/performance';
import { logInfo } from '@/lib/logger';

interface MedicalHistoryFormData {
  allergies: string[];
  medications: string[];
  conditions: string[];
  surgeries: string[];
  familyHistory: string[];
  lifestyleFactors: {
    smoking: 'never' | 'former' | 'current';
    alcohol: 'never' | 'occasional' | 'moderate' | 'heavy';
    exercise: 'none' | 'light' | 'moderate' | 'heavy';
    diet: string;
  };
}

interface PatientMedicalHistoryFormProps {
  patientId: string;
  onSubmit?: (data: MedicalHistoryFormData) => void;
  onCancel?: () => void;
  readOnly?: boolean;
}

const PatientMedicalHistoryForm: React.FC<PatientMedicalHistoryFormProps> = ({ 
  patientId,
  onSubmit,
  onCancel,
  readOnly = false
}) => {
  const [formData, setFormData] = useState<MedicalHistoryFormData>({
    allergies: [],
    medications: [],
    conditions: [],
    surgeries: [],
    familyHistory: [],
    lifestyleFactors: {
      smoking: 'never',
      alcohol: 'never',
      exercise: 'none',
      diet: ''
    }
  });
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newItem, setNewItem] = useState<{ [key: string]: string }>({
    allergies: '',
    medications: '',
    conditions: '',
    surgeries: '',
    familyHistory: ''
  });

  useEffect(() => {
    const perfTracker = trackPerformance('PatientMedicalHistoryForm_Load');
    
    setLoading(true);
    setError(null);
    
    // Simulate fetching patient medical history
    // In a real implementation, this would be a call to your API
    setTimeout(() => {
      try {
        // Mock data for demonstration
        setFormData({
          allergies: ['Penicillin', 'Pollen'],
          medications: ['Lisinopril 10mg daily', 'Atorvastatin 20mg daily'],
          conditions: ['Hypertension', 'High cholesterol'],
          surgeries: ['Appendectomy (2015)'],
          familyHistory: ['Father: Diabetes', 'Mother: Hypertension'],
          lifestyleFactors: {
            smoking: 'former',
            alcohol: 'occasional',
            exercise: 'moderate',
            diet: 'Balanced diet with occasional fast food'
          }
        });
        setLoading(false);
        perfTracker.stop();
        logInfo('Patient medical history loaded', { patientId });
      } catch (err) {
        setError('Failed to load patient medical history');
        setLoading(false);
        perfTracker.stop();
        logInfo('Error loading patient medical history', { patientId, error: err });
      }
    }, 600);
  }, [patientId]);

  const handleInputChange = (category: string, value: string) => {
    setNewItem(prev => ({ ...prev, [category]: value }));
  };

  const handleAddItem = (category: keyof MedicalHistoryFormData, item: string) => {
    if (!item.trim()) return;
    
    if (Array.isArray(formData[category])) {
      setFormData(prev => ({
        ...prev,
        [category]: [...(prev[category] as string[]), item.trim()]
      }));
      setNewItem(prev => ({ ...prev, [category]: '' }));
    }
  };

  const handleRemoveItem = (category: keyof MedicalHistoryFormData, index: number) => {
    if (Array.isArray(formData[category])) {
      setFormData(prev => ({
        ...prev,
        [category]: (prev[category] as string[]).filter((_, i) => i !== index)
      }));
    }
  };

  const handleLifestyleChange = (factor: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      lifestyleFactors: {
        ...prev.lifestyleFactors,
        [factor]: value
      }
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (onSubmit) {
      const perfTracker = trackPerformance('PatientMedicalHistoryForm_Submit');
      onSubmit(formData);
      perfTracker.stop();
      logInfo('Patient medical history submitted', { patientId });
    }
  };

  if (loading) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-sm animate-pulse">
        <div className="h-4 bg-gray-200 rounded w-1/4 mb-6"></div>
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-10 bg-gray-100 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 p-4 rounded-md">
        <p className="text-red-500">{error}</p>
        <button 
          className="mt-2 text-sm text-blue-500 hover:text-blue-700"
          onClick={() => window.location.reload()}
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow-sm">
      <h2 className="text-xl font-semibold text-gray-900 mb-6">Medical History</h2>
      
      {/* List sections */}
      {(['allergies', 'medications', 'conditions', 'surgeries', 'familyHistory'] as const).map((category) => (
        <div key={category} className="mb-6">
          <h3 className="text-md font-medium text-gray-900 mb-2 capitalize">
            {category === 'familyHistory' ? 'Family History' : category}
          </h3>
          
          <ul className="mb-2 space-y-1">
            {formData[category].length === 0 ? (
              <li className="text-gray-500 italic text-sm">No {category} recorded</li>
            ) : (
              formData[category].map((item, index) => (
                <li key={index} className="flex items-center">
                  <span className="flex-1">{item}</span>
                  {!readOnly && (
                    <button
                      type="button"
                      onClick={() => handleRemoveItem(category, index)}
                      className="ml-2 text-red-500 hover:text-red-700"
                    >
                      <span className="sr-only">Remove</span>
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </li>
              ))
            )}
          </ul>
          
          {!readOnly && (
            <div className="flex mt-2">
              <input
                type="text"
                value={newItem[category]}
                onChange={(e) => handleInputChange(category, e.target.value)}
                placeholder={`Add ${category === 'familyHistory' ? 'family history' : category.slice(0, -1)}`}
                className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              />
              <button
                type="button"
                onClick={() => handleAddItem(category, newItem[category])}
                className="ml-2 inline-flex items-center rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500"
              >
                Add
              </button>
            </div>
          )}
        </div>
      ))}
      
      {/* Lifestyle factors */}
      <div className="mb-6">
        <h3 className="text-md font-medium text-gray-900 mb-2">Lifestyle Factors</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Smoking</label>
            <select
              value={formData.lifestyleFactors.smoking}
              onChange={(e) => handleLifestyleChange('smoking', e.target.value)}
              disabled={readOnly}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            >
              <option value="never">Never smoked</option>
              <option value="former">Former smoker</option>
              <option value="current">Current smoker</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Alcohol Consumption</label>
            <select
              value={formData.lifestyleFactors.alcohol}
              onChange={(e) => handleLifestyleChange('alcohol', e.target.value)}
              disabled={readOnly}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            >
              <option value="never">Never</option>
              <option value="occasional">Occasional</option>
              <option value="moderate">Moderate</option>
              <option value="heavy">Heavy</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Exercise Level</label>
            <select
              value={formData.lifestyleFactors.exercise}
              onChange={(e) => handleLifestyleChange('exercise', e.target.value)}
              disabled={readOnly}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            >
              <option value="none">None</option>
              <option value="light">Light</option>
              <option value="moderate">Moderate</option>
              <option value="heavy">Heavy</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Diet</label>
            <input
              type="text"
              value={formData.lifestyleFactors.diet}
              onChange={(e) => handleLifestyleChange('diet', e.target.value)}
              disabled={readOnly}
              placeholder="Describe your diet"
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            />
          </div>
        </div>
      </div>
      
      {!readOnly && (
        <div className="flex justify-end space-x-3 mt-6">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="rounded-md bg-white px-3.5 py-2.5 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
            >
              Cancel
            </button>
          )}
          <button
            type="submit"
            className="rounded-md bg-blue-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-500"
          >
            Save Medical History
          </button>
        </div>
      )}
    </form>
  );
};

export default PatientMedicalHistoryForm;
