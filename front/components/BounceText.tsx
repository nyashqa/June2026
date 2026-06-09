// Each letter bounces with its own delay — old flash-intro vibe.
export default function BounceText({ text }: { text: string }) {
  return (
    <span className="bounce-letters" aria-label={text}>
      {text.split("").map((ch, i) => (
        <span key={i} style={{ animationDelay: `${i * 0.08}s` }} aria-hidden>
          {ch === " " ? " " : ch}
        </span>
      ))}
    </span>
  );
}
