export default function CategorySidebar({ title, items = [] }) {
  return (
    <aside className="category-sidebar">
      <h3>{title}</h3>

      <div className="category-list">
        {items.map((item) => (
          <button key={item} type="button" className="category-item">
            {item}
          </button>
        ))}
      </div>
    </aside>
  );
}