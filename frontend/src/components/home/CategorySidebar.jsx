// Reusable sidebar that renders selectable category/filter items.
export default function CategorySidebar({
  title,
  items = [],
  activeKey,
  onSelect,
}) {
  return (
    // Sidebar wrapper for the title and item list.
    <aside className="category-sidebar">
      <h3>{title}</h3>

      {/* Adds a modifier class when one item is currently active. */}
      <div className={`category-list ${activeKey ? "has-active" : ""}`}>
        {items.map((item) => (
          <button
            // Prefer a stable item key, otherwise fall back to the label.
            key={item.key || item.label}
            type="button"
            // Highlight the selected item based on activeKey.
            className={`category-item ${
              activeKey && activeKey === item.key ? "is-active" : ""
            }`}
            // Send the clicked item key back to the parent component.
            onClick={() => onSelect?.(item.key)}
          >
            {/* Small icon/marker area for the item. */}
            <span className={`brand-mark ${item.className || ""}`}>
              {item.mark}
            </span>
            {/* Human-readable item label. */}
            <span className="brand-label">{item.label}</span>
          </button>
        ))}
      </div>
    </aside>
  );
}
