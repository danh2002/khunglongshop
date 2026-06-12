export default function RouteLoading() {
  return (
    <main className="route-loading" aria-busy="true" aria-label="Đang tải trang">
      <div className="route-loading__hero" />
      <div className="route-loading__grid">
        {Array.from({ length: 8 }, (_, index) => (
          <div className="route-loading__card" key={index}>
            <div className="route-loading__image" />
            <div className="route-loading__line" />
            <div className="route-loading__line route-loading__line--short" />
          </div>
        ))}
      </div>
    </main>
  );
}
