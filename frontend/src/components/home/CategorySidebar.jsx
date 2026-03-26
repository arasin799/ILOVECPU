export default function CategorySidebar({
  title,
  items = [],
  activeKey,
  onSelect,
}) {
  return (
    <aside className="category-sidebar">
      <h3>{title}</h3>

      <div className={`category-list ${activeKey ? "has-active" : ""}`}>
        {items.map((item) => (
          <button
            key={item.key || item.label}
            type="button"
            className={`category-item ${
              activeKey && activeKey === item.key ? "is-active" : ""
            }`}
            onClick={() => onSelect?.(item.key)}
          >
            <span className={`brand-mark ${item.className || ""}`}>
              {item.mark}
            </span>
            <span className="brand-label">{item.label}</span>
          </button>
        ))}
      </div>
    </aside>
  );
}
