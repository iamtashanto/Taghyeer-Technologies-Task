import Link from "next/link";
import { ArrowUpRight, Radio, Users, Zap } from "lucide-react";

export default function Home() {
  return (
    <main className="landing">
      <nav className="landing-nav">
        <Link className="logo" href="/">
          <span className="logo-mark">r/</span> relay
        </Link>
        <Link className="nav-link" href="/chat">
          Open the workspace <ArrowUpRight size={15} />
        </Link>
      </nav>
      <section className="hero">
        <div>
          <div className="kicker">
            <span /> conversation, without the clutter
          </div>
          <h1>Keep the thread. Lose the noise.</h1>
          <p className="hero-copy">
            Relay is a calm, capable chat workspace for the conversations that
            move work forward, whether it is one person or the whole room.
          </p>
          <div className="cta-row">
            <Link className="button-primary" href="/chat">
              Enter Relay <ArrowUpRight size={16} />
            </Link>
            <a className="button-secondary" href="#signals">
              See what it does ↓
            </a>
          </div>
        </div>
        <div className="hero-art" aria-label="Relay conversation preview">
          <div className="orbit" />
          <article className="note-card primary">
            <div className="note-label">
              <span>relay / 09:41</span>
              <span>● live</span>
            </div>
            <p>Good conversations leave a trail you can actually follow.</p>
          </article>
          <article className="note-card secondary">
            <div className="note-label">
              <span>new signal</span>
              <span>02</span>
            </div>
            <p>“The room is ready when you are.”</p>
          </article>
          <div className="pulse">
            REAL
            <br />
            TIME
          </div>
        </div>
      </section>
      <div className="ticker" aria-label="Feature ticker">
        <div className="ticker-inner">
          <div className="ticker-track">
            One-to-one clarity <b>✳</b> Group momentum <b>✳</b> Messages that
            arrive <b>✳</b>
          </div>
          <div className="ticker-track" aria-hidden="true">
            One-to-one clarity <b>✳</b> Group momentum <b>✳</b> Messages that
            arrive <b>✳</b>
          </div>
        </div>
      </div>
      <section className="feature-band" id="signals">
        <div>
          <div className="kicker">
            <span /> built for the next message
          </div>
          <h2>A better place for the important stuff.</h2>
          <p className="feature-intro">
            No dashboards pretending to be conversations. Just a focused space
            with enough structure to keep people in sync.
          </p>
        </div>
        <div className="features">
          <article className="feature">
            <div className="feature-index">01 /</div>
            <h3>Direct by default</h3>
            <p>
              Find a person by name or number and start exactly where the
              conversation belongs.
            </p>
          </article>
          <article className="feature">
            <div className="feature-index">02 /</div>
            <h3>Rooms that scale</h3>
            <p>
              Create group conversations when the work gets bigger than two
              people.
            </p>
          </article>
          <article className="feature">
            <div className="feature-index">03 /</div>
            <h3>Always arriving</h3>
            <p>
              Live updates bring new messages in without interrupting the
              moment.
            </p>
          </article>
          <article className="feature">
            <div className="feature-index">04 /</div>
            <h3>Respectful memory</h3>
            <p>
              Read the latest or scroll back through the full history at your
              own pace.
            </p>
          </article>
        </div>
      </section>
      <footer className="footer">
        <span>relay / conversations with shape</span>
        <span>© 2026 / built for real teams</span>
      </footer>
    </main>
  );
}
