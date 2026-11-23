/** Product quality and testing statements stay plain text, without badges. */
export function ProductQualityList({ claims }: { claims: string[] }) {
  return <ul className="sl-protein-quality">{claims.map(claim => (
    <li key={claim}>{claim}</li>
  ))}</ul>;
}
