import { Hero } from '../sections/Hero';
import { Intro } from '../sections/Intro';
import { Philosophy } from '../sections/Philosophy';
import { Training } from '../sections/Training';
import { Coaching } from '../sections/Coaching';
import { Gallery } from '../sections/Gallery';
import { Reviews } from '../sections/Reviews';
import { Enquiry } from '../sections/Enquiry';
import { Location } from '../sections/Location';
import { Contact } from '../sections/Contact';
import { usePageTitle } from '../components/ScrollManager';

export const HOME_TITLE = 'OUTFIT X HSR | Strength Training & Fitness in Bengaluru';
export const HOME_DESCRIPTION =
  "Explore OUTFIT X HSR in HSR Layout, Bengaluru. Learn about the gym's training approach, discover fitness options, and enquire about membership.";

export function Home() {
  usePageTitle(HOME_TITLE, HOME_DESCRIPTION);
  return (
    <>
      <Hero />
      <Intro />
      <Philosophy />
      <Training />
      <Coaching />
      <Gallery />
      <Reviews />
      <Enquiry />
      <Location />
      <Contact />
    </>
  );
}
