export function CerimonialBlank({ title, text }: { title: string; text: string }) {
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-10">
      <p className="text-xs font-extrabold tracking-[0.2em] text-teal uppercase">Cerimonial</p>
      <h1 className="mt-2 font-heading text-4xl text-purple italic">{title}</h1>
      <div className="mt-6 rounded-[1.5rem] border border-dashed border-purple/20 bg-white px-6 py-12 text-center">
        <p className="text-sm font-semibold text-muted-foreground">{text}</p>
      </div>
    </main>
  );
}
