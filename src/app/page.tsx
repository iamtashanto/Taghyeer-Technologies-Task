import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

export default function Home() {
  return (
    <main className="min-h-screen overflow-hidden bg-paper">
      <nav className="mx-auto flex w-[min(1180px,calc(100%-48px))] items-center justify-between py-[26px] max-[500px]:w-[calc(100%-32px)]">
        <Link className="flex items-center gap-[10px] text-[18px] font-extrabold tracking-[-0.04em]" href="/">
          <span className="grid h-[31px] w-[31px] place-items-center rounded-[10px_10px_10px_3px] bg-ink font-dmmono text-[13px] text-lime">r/</span>
          relay
        </Link>
        <Link className="text-[13px] font-bold text-muted max-[500px]:hidden" href="/chat">
          Open the workspace <ArrowUpRight className="inline" size={15} />
        </Link>
      </nav>

      <section className="mx-auto grid min-h-[680px] w-[min(1180px,calc(100%-48px))] grid-cols-[0.92fr_1.08fr] items-center gap-[70px] pt-[84px] pb-[100px] max-[800px]:grid-cols-1 max-[800px]:gap-[50px] max-[800px]:pt-[55px] max-[500px]:w-[calc(100%-32px)]">
        <div>
          <div className="flex items-center gap-[9px] font-dmmono text-[11px] uppercase tracking-[0.1em] text-teal">
            <span className="h-[6px] w-[6px] rounded-full bg-coral" />
            conversation, without the clutter
          </div>

          <h1 className="my-[22px] max-w-[670px] text-[clamp(52px,7vw,92px)] leading-[0.96] tracking-[-0.075em] max-[500px]:text-[55px]">
            Keep the thread. Lose the noise.
          </h1>

          <p className="mb-[34px] max-w-[490px] text-[17px] leading-[1.75] text-muted">
            Relay is a calm, capable chat workspace for the conversations that move work forward, whether it is one person or the whole room.
          </p>

          <div className="flex flex-wrap items-center gap-[18px]">
            <Link className="inline-flex items-center gap-[9px] rounded-full bg-lime px-[20px] py-[15px] text-[14px] font-extrabold text-ink shadow-[0_8px_20px_rgba(143,170,34,0.18)]" href="/chat">
              Enter Relay <ArrowUpRight size={16} />
            </Link>
            <a className="text-[13px] font-extrabold text-muted" href="#signals">See what it does ↓</a>
          </div>
        </div>

        <div className="relative min-h-[475px] max-[800px]:min-h-[390px]" aria-label="Relay conversation preview">
          <div className="absolute [inset:10px_20px_20px_0] rotate-[-19deg] rounded-full border border-[#c9cec2] after:absolute after:[inset:42px_32px] after:rounded-full after:border after:border-dashed after:border-[#c9cec2] after:content-['']" />

          <article className="absolute top-[45px] right-[25px] w-[310px] rotate-[5deg] rounded-[20px] bg-ink p-[25px] text-cream shadow-relay max-[800px]:right-0 max-[500px]:w-[250px]">
            <div className="flex justify-between font-dmmono text-[10px] uppercase text-[#aab4ac]"><span>relay / 09:41</span><span>● live</span></div>
            <p className="mt-[28px] text-[19px] font-bold leading-[1.35] tracking-[-0.04em]">Good conversations leave a trail you can actually follow.</p>
          </article>

          <article className="absolute bottom-[45px] left-[25px] w-[310px] rotate-[-7deg] rounded-[20px] bg-lime p-[25px] shadow-relay max-[800px]:left-0 max-[500px]:w-[250px]">
            <div className="flex justify-between font-dmmono text-[10px] uppercase text-[#617000]"><span>new signal</span><span>02</span></div>
            <p className="mt-[28px] text-[19px] font-bold leading-[1.35] tracking-[-0.04em] text-ink">“The room is ready when you are.”</p>
          </article>

          <div className="absolute right-[11%] bottom-[7%] grid h-[74px] w-[74px] place-items-center rotate-[13deg] rounded-full bg-coral text-center font-dmmono text-[10px] text-cream">REAL<br />TIME</div>
        </div>
      </section>

      <div className="overflow-hidden border-y border-line font-dmmono text-[11px] uppercase tracking-[0.12em] text-muted" aria-label="Feature ticker">
        <div className="flex w-max animate-drift py-[16px] will-change-transform">
          <div className="flex min-w-[100vw] shrink-0 items-center justify-around gap-[40px] whitespace-nowrap">One-to-one clarity <b className="mx-[40px] text-coral">✳</b> Group momentum <b className="mx-[40px] text-coral">✳</b> Messages that arrive <b className="mx-[40px] text-coral">✳</b></div>
          <div className="flex min-w-[100vw] shrink-0 items-center justify-around gap-[40px] whitespace-nowrap" aria-hidden="true">One-to-one clarity <b className="mx-[40px] text-coral">✳</b> Group momentum <b className="mx-[40px] text-coral">✳</b> Messages that arrive <b className="mx-[40px] text-coral">✳</b></div>
        </div>
      </div>

      <section className="mx-auto grid w-[min(1180px,calc(100%-48px))] grid-cols-[0.8fr_1.2fr] gap-[90px] py-[100px] max-[800px]:grid-cols-1 max-[800px]:gap-[50px] max-[500px]:w-[calc(100%-32px)]" id="signals">
        <div>
          <div className="flex items-center gap-[9px] font-dmmono text-[11px] uppercase tracking-[0.1em] text-teal"><span className="h-[6px] w-[6px] rounded-full bg-coral" /> built for the next message</div>
          <h2 className="m-0 text-[clamp(32px,4vw,54px)] leading-[1.05] tracking-[-0.06em]">A better place for the important stuff.</h2>
          <p className="leading-[1.7] text-muted">No dashboards pretending to be conversations. Just a focused space with enough structure to keep people in sync.</p>
        </div>

        <div className="grid grid-cols-2 gap-[1px] border border-line bg-line max-[500px]:grid-cols-1">
          <article className="min-h-[180px] bg-cream p-[25px]"><div className="font-dmmono text-[11px] text-coral">01 /</div><h3 className="mt-[35px] mb-[10px] text-[16px]">Direct by default</h3><p className="m-0 text-[13px] leading-[1.6] text-muted">Find a person by name or number and start exactly where the conversation belongs.</p></article>
          <article className="min-h-[180px] bg-cream p-[25px]"><div className="font-dmmono text-[11px] text-coral">02 /</div><h3 className="mt-[35px] mb-[10px] text-[16px]">Rooms that scale</h3><p className="m-0 text-[13px] leading-[1.6] text-muted">Create group conversations when the work gets bigger than two people.</p></article>
          <article className="min-h-[180px] bg-cream p-[25px]"><div className="font-dmmono text-[11px] text-coral">03 /</div><h3 className="mt-[35px] mb-[10px] text-[16px]">Always arriving</h3><p className="m-0 text-[13px] leading-[1.6] text-muted">Live updates bring new messages in without interrupting the moment.</p></article>
          <article className="min-h-[180px] bg-cream p-[25px]"><div className="font-dmmono text-[11px] text-coral">04 /</div><h3 className="mt-[35px] mb-[10px] text-[16px]">Respectful memory</h3><p className="m-0 text-[13px] leading-[1.6] text-muted">Read the latest or scroll back through the full history at your own pace.</p></article>
        </div>
      </section>

      <footer className="mx-auto flex w-[min(1180px,calc(100%-48px))] justify-between border-t border-line pt-[28px] pb-[46px] font-dmmono text-[11px] text-muted max-[500px]:block max-[500px]:w-[calc(100%-32px)] max-[500px]:leading-8">
        <span className="max-[500px]:block">relay / conversations with shape</span>
        <span className="max-[500px]:block">© 2026 / built for real teams</span>
      </footer>
    </main>
  );
}
