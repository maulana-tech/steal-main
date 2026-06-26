export function Hero() {
  return (
    <div className="flex flex-col items-center gap-5 text-center">
      <h1
        className="text-5xl font-medium leading-tight tracking-tight text-white sm:text-7xl"
        style={{ fontFamily: "'Instrument Serif', serif" }}
      >
        Borrow in the <em className="italic">dark</em>.
      </h1>
      <p className="max-w-md text-base leading-7 text-white/60">
        Confidential lending on Stellar. Collateral, debt, and credit scores stay hidden
        behind zero-knowledge proofs.
        <br />
        Visible to no one but you.
      </p>
    </div>
  );
}
