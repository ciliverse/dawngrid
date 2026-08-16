const NODES = [
  { left: "11%", top: "20%" },
  { left: "76%", top: "16%" },
  { left: "32%", top: "64%" },
  { left: "88%", top: "70%" },
  { left: "54%", top: "38%" },
];

export function TechFloor() {
  return (
    <div className="tech-floor" aria-hidden>
      {NODES.map((node, index) => (
        <span
          key={`${node.left}-${node.top}`}
          className="tech-floor-node"
          style={{ left: node.left, top: node.top, animationDelay: `${index * 0.7}s` }}
        />
      ))}
    </div>
  );
}
