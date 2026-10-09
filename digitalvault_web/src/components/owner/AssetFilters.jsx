import { Search } from 'lucide-react'
import { Form } from 'react-bootstrap'

// Ô tìm kiếm và các tab lọc theo loại tài sản
export default function AssetFilters({ query, onQueryChange, tabs, activeType, onTypeChange }) {
  return (
    <div className="d-flex flex-column gap-3">
      <div className="av-search">
        <Search size={16} className="av-field-icon" aria-hidden="true" />
        <Form.Control
          type="search"
          aria-label="Tìm kiếm tài sản"
          placeholder="Tìm kiếm tài sản theo tên, mô tả, người thụ hưởng..."
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          className="av-input av-input-icon"
        />
      </div>
      <div className="av-tabs">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            aria-pressed={tab.key === activeType}
            onClick={() => onTypeChange(tab.key)}
            className="av-tab"
          >
            {`${tab.label} (${tab.count})`}
          </button>
        ))}
      </div>
    </div>
  )
}
