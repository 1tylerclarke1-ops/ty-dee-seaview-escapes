export default function PageHero({ title, subtitle }) {
  return (
    <section className="pt-36 md:pt-44 pb-12 md:pb-16 px-6 md:px-10 max-w-[1400px] mx-auto">
      <h1 className="text-5xl md:text-7xl text-ink leading-[1.02]">{title}</h1>
      {subtitle && (
        <p className="mt-6 text-lg md:text-xl text-muted-foreground max-w-2xl leading-relaxed">
          {subtitle}
        </p>
      )}
    </section>
  );
}