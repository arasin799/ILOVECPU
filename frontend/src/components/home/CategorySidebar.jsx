export default function CategorySidebar({ title, items = [] }) {
  return (
    <aside className="category-sidebar">
      <h3>{title}</h3>

      <div className="category-list">
        {items.map((item) => (
          <button key={item.label} type="button" className="category-item">
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