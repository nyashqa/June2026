// The sacred <marquee>, reborn in CSS.
export default function Marquee({ text }: { text: string }) {
  return (
    <div className="marquee">
      <span className="marquee__inner">{text}</span>
    </div>
  );
}
