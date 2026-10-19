import { Link } from 'react-router-dom';
import { usePageTitle } from '../components/ScrollManager';

export function NotFound() {
  usePageTitle('Page not found | RK Fitness Center-Gym');
  return (
    <section className="flex min-h-[80svh] items-center bg-ink pt-24">
      <div className="container-x">
        <p className="eyebrow text-signal">404</p>
        <h1 className="display mt-6 text-[clamp(3.4rem,12vw,9rem)] text-white">Off the plan.</h1>
        <p className="mt-6 max-w-md text-lg text-white/65">That page doesn't exist. Head back and keep training with intent.</p>
        <Link to="/" className="eyebrow mt-10 inline-flex bg-white px-7 py-4 text-ink transition-colors hover:bg-signal hover:text-white">
          Back to home
        </Link>
      </div>
    </section>
  );
}
