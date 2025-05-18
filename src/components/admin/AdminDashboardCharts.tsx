'use client';

import React, { useState, useEffect } from 'react';
import { trackPerformance } from '@/lib/performance';
import { logInfo } from '@/lib/logger';

interface ChartData {
  labels: string[];
  datasets: {
    label: string;
    data: number[];
    backgroundColor: string[];
    borderColor?: string[];
    borderWidth?: number;
  }[];
}

interface AdminDashboardChartsProps {
  timeRange?: 'day' | 'week' | 'month' | 'year';
}

const AdminDashboardCharts: React.FC<AdminDashboardChartsProps> = ({ 
  timeRange = 'week'
}) => {
  const [appointmentsData, setAppointmentsData] = useState<ChartData | null>(null);
  const [usersData, setUsersData] = useState<ChartData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const perfTracker = trackPerformance('AdminDashboardCharts_Load');
    
    setLoading(true);
    setError(null);
    
    // Simulate fetching chart data
    // In a real implementation, this would be a call to your API
    setTimeout(() => {
      try {
        // Mock data for appointments chart
        setAppointmentsData({
          labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
          datasets: [
            {
              label: 'Appointments',
              data: [12, 19, 15, 8, 22, 14, 11],
              backgroundColor: [
                'rgba(54, 162, 235, 0.5)',
                'rgba(54, 162, 235, 0.5)',
                'rgba(54, 162, 235, 0.5)',
                'rgba(54, 162, 235, 0.5)',
                'rgba(54, 162, 235, 0.5)',
                'rgba(54, 162, 235, 0.5)',
                'rgba(54, 162, 235, 0.5)'
              ],
              borderColor: [
                'rgba(54, 162, 235, 1)',
                'rgba(54, 162, 235, 1)',
                'rgba(54, 162, 235, 1)',
                'rgba(54, 162, 235, 1)',
                'rgba(54, 162, 235, 1)',
                'rgba(54, 162, 235, 1)',
                'rgba(54, 162, 235, 1)'
              ],
              borderWidth: 1
            }
          ]
        });
        
        // Mock data for users chart
        setUsersData({
          labels: ['Patients', 'Doctors', 'Admins'],
          datasets: [
            {
              label: 'Users by Type',
              data: [65, 15, 5],
              backgroundColor: [
                'rgba(255, 99, 132, 0.5)',
                'rgba(75, 192, 192, 0.5)',
                'rgba(153, 102, 255, 0.5)'
              ],
              borderColor: [
                'rgba(255, 99, 132, 1)',
                'rgba(75, 192, 192, 1)',
                'rgba(153, 102, 255, 1)'
              ],
              borderWidth: 1
            }
          ]
        });
        
        setLoading(false);
        perfTracker.stop();
        logInfo('Admin dashboard charts loaded', { timeRange });
      } catch (err) {
        setError('Failed to load dashboard charts');
        setLoading(false);
        perfTracker.stop();
        logInfo('Error loading admin dashboard charts', { timeRange, error: err });
      }
    }, 800);
  }, [timeRange]);

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="h-40 bg-gray-100 rounded"></div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="h-40 bg-gray-100 rounded"></div>
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
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div className="bg-white p-6 rounded-lg shadow-sm">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Appointments ({timeRange})</h3>
        <div className="relative">
          {/* In a real implementation, you would render a chart library component here */}
          <div className="h-64 flex items-end space-x-2">
            {appointmentsData?.datasets[0].data.map((value, index) => (
              <div 
                key={index} 
                className="flex-1 bg-blue-400 hover:bg-blue-500 transition-colors rounded-t"
                style={{ height: `${(value / 25) * 100}%` }}
                title={`${appointmentsData.labels[index]}: ${value} appointments`}
              >
                <div className="h-full flex flex-col justify-end">
                  <div className="text-xs text-white font-bold text-center p-1">
                    {value}
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="flex justify-between mt-2">
            {appointmentsData?.labels.map((label, index) => (
              <div key={index} className="text-xs text-gray-500">{label}</div>
            ))}
          </div>
        </div>
      </div>
      
      <div className="bg-white p-6 rounded-lg shadow-sm">
        <h3 className="text-lg font-medium text-gray-900 mb-4">User Distribution</h3>
        <div className="relative">
          {/* In a real implementation, you would render a chart library component here */}
          <div className="h-64 flex items-center justify-center">
            <div className="w-48 h-48 rounded-full border-8 border-gray-100 relative">
              {usersData?.datasets[0].data.map((value, index) => {
                const total = usersData.datasets[0].data.reduce((a, b) => a + b, 0);
                const percentage = Math.round((value / total) * 100);
                const color = usersData.datasets[0].backgroundColor[index].replace('0.5', '1');
                
                // This is a simplified representation of a pie chart
                return (
                  <div 
                    key={index}
                    className="absolute inset-0 flex items-center justify-center"
                    style={{ 
                      clipPath: `polygon(50% 50%, 50% 0, ${50 + 50 * Math.cos(index * (2 * Math.PI / 3))}% ${50 + 50 * Math.sin(index * (2 * Math.PI / 3))}%, ${50 + 50 * Math.cos((index + 1) * (2 * Math.PI / 3))}% ${50 + 50 * Math.sin((index + 1) * (2 * Math.PI / 3))}%)`,
                      backgroundColor: color
                    }}
                  >
                    <span className="text-xs font-bold text-white">{percentage}%</span>
                  </div>
                );
              })}
            </div>
          </div>
          <div className="flex justify-center space-x-6 mt-4">
            {usersData?.labels.map((label, index) => (
              <div key={index} className="flex items-center">
                <div 
                  className="w-3 h-3 rounded-full mr-1" 
                  style={{ backgroundColor: usersData.datasets[0].backgroundColor[index].replace('0.5', '1') }}
                ></div>
                <span className="text-xs text-gray-600">{label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboardCharts;
