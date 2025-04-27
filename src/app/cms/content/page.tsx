'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { logInfo } from '@/lib/logger';

interface ContentItem {
  id: string;
  title: string;
  type: 'ANNOUNCEMENT' | 'RESOURCE' | 'FAQ' | 'POLICY';
  status: 'PUBLISHED' | 'DRAFT';
  lastUpdated: string;
  author: string;
}

/**
 * Content Management Page
 * Allows admins to edit site content, announcements, and resources
 * 
 * @returns Content Management component
 */
export default function ContentManagementPage() {
  // Mock data for content items
  const [contentItems, setContentItems] = useState<ContentItem[]>([
    { 
      id: 'content1', 
      title: 'New Telemedicine Features Launched',
      type: 'ANNOUNCEMENT',
      status: 'PUBLISHED',
      lastUpdated: new Date().toISOString(),
      author: 'Admin Team'
    },
    { 
      id: 'content2', 
      title: 'COVID-19 Vaccination Information',
      type: 'RESOURCE',
      status: 'PUBLISHED',
      lastUpdated: new Date(Date.now() - 7 * 86400000).toISOString(),
      author: 'Dr. Jane Smith'
    },
    { 
      id: 'content3', 
      title: 'Updated Privacy Policy 2023',
      type: 'POLICY',
      status: 'DRAFT',
      lastUpdated: new Date(Date.now() - 2 * 86400000).toISOString(),
      author: 'Legal Team'
    },
    { 
      id: 'content4', 
      title: 'Frequently Asked Questions About Appointments',
      type: 'FAQ',
      status: 'PUBLISHED',
      lastUpdated: new Date(Date.now() - 14 * 86400000).toISOString(),
      author: 'Support Team'
    },
  ]);
  
  const [typeFilter, setTypeFilter] = useState<ContentItem['type'] | 'ALL'>('ALL');
  const [statusFilter, setStatusFilter] = useState<ContentItem['status'] | 'ALL'>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  
  useEffect(() => {
    // Log when component mounts
    logInfo('Content Management page mounted');
    
    // In a real implementation, fetch content from backend
    // const fetchContentItems = async () => {
    //   try {
    //     const response = await callApi('getAllContentItems');
    //     setContentItems(response.data);
    //   } catch (error) {
    //     console.error('Error fetching content items:', error);
    //   }
    // };
    
    // fetchContentItems();
  }, []);
  
  // Filter content items based on selected filters and search term
  const filteredItems = contentItems.filter(item => {
    const matchesType = typeFilter === 'ALL' || item.type === typeFilter;
    const matchesStatus = statusFilter === 'ALL' || item.status === statusFilter;
    const matchesSearch = searchTerm === '' || 
      item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.author.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesType && matchesStatus && matchesSearch;
  });
  
  // Format date for display
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };
  
  // Get badge style based on status
  const getStatusBadgeStyle = (status: ContentItem['status']) => {
    switch(status) {
      case 'PUBLISHED':
        return 'bg-green-100 text-green-800';
      case 'DRAFT':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };
  
  // Get badge style based on content type
  const getTypeBadgeStyle = (type: ContentItem['type']) => {
    switch(type) {
      case 'ANNOUNCEMENT':
        return 'bg-blue-100 text-blue-800';
      case 'RESOURCE':
        return 'bg-purple-100 text-purple-800';
      case 'FAQ':
        return 'bg-indigo-100 text-indigo-800';
      case 'POLICY':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };
  
  // Toggle content item status
  const toggleStatus = (id: string) => {
    setContentItems(prevItems => 
      prevItems.map(item => {
        if (item.id === id) {
          const newStatus = item.status === 'PUBLISHED' ? 'DRAFT' : 'PUBLISHED';
          logInfo(`Content item ${id} status changed to ${newStatus}`);
          return { ...item, status: newStatus };
        }
        return item;
      })
    );
  };
  
  return (
    <div className="p-8">
      <header className="mb-8">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold mb-4">Content Management</h1>
          <div className="flex space-x-4">
            <Link 
              href="/cms/content/new"
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              New Content
            </Link>
            <Link 
              href="/cms" 
              className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50"
            >
              Back to CMS
            </Link>
          </div>
        </div>
        <p className="text-gray-600">
          Manage website content, announcements, resources, and policies
        </p>
      </header>
      
      {/* Filters */}
      <div className="bg-white shadow-md rounded-lg overflow-hidden mb-6">
        <div className="p-4 bg-gray-50 border-b">
          <h2 className="font-semibold">Filters and Search</h2>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label htmlFor="type-filter" className="block text-sm font-medium text-gray-700 mb-1">
                Content Type
              </label>
              <select
                id="type-filter"
                className="w-full border rounded p-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value as ContentItem['type'] | 'ALL')}
              >
                <option value="ALL">All Types</option>
                <option value="ANNOUNCEMENT">Announcement</option>
                <option value="RESOURCE">Resource</option>
                <option value="FAQ">FAQ</option>
                <option value="POLICY">Policy</option>
              </select>
            </div>
            
            <div>
              <label htmlFor="status-filter" className="block text-sm font-medium text-gray-700 mb-1">
                Status
              </label>
              <select
                id="status-filter"
                className="w-full border rounded p-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as ContentItem['status'] | 'ALL')}
              >
                <option value="ALL">All Statuses</option>
                <option value="PUBLISHED">Published</option>
                <option value="DRAFT">Draft</option>
              </select>
            </div>
            
            <div>
              <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-1">
                Search
              </label>
              <input
                id="search"
                type="text"
                className="w-full border rounded p-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Search by title or author..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </div>
      </div>
      
      {/* Content Items List */}
      <div className="bg-white shadow-md rounded-lg overflow-hidden">
        <div className="p-4 bg-gray-50 border-b flex justify-between items-center">
          <h2 className="font-semibold">Content Items ({filteredItems.length})</h2>
        </div>
        
        {filteredItems.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            No content items match the current filters
          </div>
        ) : (
          <ul className="divide-y divide-gray-200">
            {filteredItems.map(item => (
              <li key={item.id} className="p-4 hover:bg-gray-50">
                <div className="flex flex-col md:flex-row md:justify-between md:items-center">
                  <div className="mb-2 md:mb-0">
                    <h3 className="font-medium">{item.title}</h3>
                    <div className="mt-1 flex flex-wrap gap-2">
                      <span className={`px-2 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full ${getTypeBadgeStyle(item.type)}`}>
                        {item.type}
                      </span>
                      <span className={`px-2 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadgeStyle(item.status)}`}>
                        {item.status}
                      </span>
                    </div>
                    <div className="text-sm text-gray-500 mt-1">
                      Updated: {formatDate(item.lastUpdated)} by {item.author}
                    </div>
                  </div>
                  
                  <div className="flex flex-wrap gap-2">
                    <Link 
                      href={`/cms/content/edit/${item.id}`}
                      className="px-3 py-1 bg-gray-100 text-gray-700 rounded text-sm hover:bg-gray-200"
                    >
                      Edit
                    </Link>
                    <button 
                      onClick={() => toggleStatus(item.id)}
                      className={`px-3 py-1 rounded text-sm ${
                        item.status === 'PUBLISHED' 
                          ? 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'
                          : 'bg-green-100 text-green-700 hover:bg-green-200'
                      }`}
                    >
                      {item.status === 'PUBLISHED' ? 'Unpublish' : 'Publish'}
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
} 