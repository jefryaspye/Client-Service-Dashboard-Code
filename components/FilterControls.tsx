
import React from 'react';

interface FilterControlsProps {
  searchTerm: string;
  onSearchChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
}

const FilterControls: React.FC<FilterControlsProps> = ({
  searchTerm,
  onSearchChange,
}) => {
  return (
    <div className="bg-gray-800 p-4 rounded-lg shadow-lg flex flex-col sm:flex-row items-center justify-between gap-4">
      <h3 className="text-lg font-semibold text-white mr-4 flex-shrink-0">Search Tickets</h3>
      <div className="w-full sm:max-w-md">
          <label htmlFor="search-filter" className="sr-only">Search</label>
          <input
            type="text"
            id="search-filter"
            value={searchTerm}
            onChange={onSearchChange}
            className="bg-gray-700 border border-gray-600 text-white text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
            placeholder="Search by ID, Item, or Assignee..."
            aria-label="Search tickets"
          />
      </div>
    </div>
  );
};

export default FilterControls;
