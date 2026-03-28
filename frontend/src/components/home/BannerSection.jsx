// Simple hero/banner strip shown on the home page.
export default function BannerSection() {
  return (
    // Wraps the three promo cards in one section.
    <section className="banner-section">
      {/* Promo card 1 */}
      <div className="banner-card banner-dark">Gaming PC</div>
      {/* Promo card 2 */}
      <div className="banner-card banner-light">PRE-ORDER SERIES</div>
      {/* Promo card 3 */}
      <div className="banner-card banner-red">RTX / CPU DEAL</div>
    </section>
  );
}
