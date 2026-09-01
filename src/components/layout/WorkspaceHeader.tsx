export function WorkspaceHeader() {
  return (
    <div className="mx-auto max-w-xl text-center">
      <p className="cf-label mb-3 text-accent-cyan">AI context packager</p>
      <h1 className="text-2xl font-medium tracking-tight text-text-primary sm:text-[28px]">
        Forge a smaller, sharper codebase context.
      </h1>
      <p className="mt-3 text-sm leading-relaxed text-text-secondary">
        Import a repository, exclude the noise, and export one optimized Markdown bundle for Claude, GPT, Cursor,
        and similar tools — entirely in your browser.
      </p>
    </div>
  );
}
